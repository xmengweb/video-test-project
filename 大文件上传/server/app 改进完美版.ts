//app.js
import http from "http";
import multiparty from "multiparty"; // 中间件，处理FormData对象的中间件
import path from "path";
import fse from "fs-extra"; //文件处理模块

const server = http.createServer();

const UPLOAD_DIR = path.resolve(__dirname, ".", "qiepian"); // 读取根目录，创建一个文件夹qiepian存放切片
server.on("request", async (req, res) => {
  if (req.url === "/upload") {
    //前端访问的地址正确
    const multipart = new multiparty.Form(); // 解析FormData对象
    multipart.parse(req, async (err, fields, files) => {
      if (err) {
        //解析失败
        return;
      }
      const [file] = files.file;
      const [fileName] = fields.fileName;
      const [chunkName] = fields.chunkName;

      const chunkDir = path.resolve(UPLOAD_DIR, `${fileName}-chunks`); //在qiepian文件夹创建一个新的文件夹，存放接收到的所有切片
      if (!fse.existsSync(chunkDir)) {
        //文件夹不存在，新建该文件夹
        await fse.mkdirs(chunkDir);
      }
      // 把切片移动进chunkDir
      await fse.move(file.path, `${chunkDir}/${chunkName}`, { overwrite: true });
      res.end(
        JSON.stringify({
          //向前端输出
          code: 0,
          message: "切片上传成功",
        })
      );
    });
  }
  if (req.url === "/merge") {
    // 该去合并切片了
    const data = await resolvePost(req);
    const { fileName, size } = data;
    const filePath = path.resolve(UPLOAD_DIR, fileName); //获取切片路径
    await mergeFileChunk(filePath, fileName, size);
    res.end(
      JSON.stringify({
        code: 0,
        message: "文件合并成功",
      })
    );
  }
  // 合并
  async function mergeFileChunk(filePath: string, fileName: string, size: number) {
    const chunkDir = path.resolve(UPLOAD_DIR, `${fileName}-chunks`);
    let chunkPaths = await fse.readdir(chunkDir);
    chunkPaths.sort((a, b) => parseInt(a.split("-")[1]) - parseInt(b.split("-")[1]));
    const writeStream = fse.createWriteStream(filePath);
    for (let i = 0; i < chunkPaths.length; i++) {
      const chunkPath = path.resolve(chunkDir, chunkPaths[i]);
      const readStream = fse.createReadStream(chunkPath);
      await pipeStream(readStream, writeStream);
      fse.unlinkSync(chunkPath);
    }
    writeStream.close();
    fse.rmdirSync(chunkDir); // 删除切片文件夹
  }
  // 将可读流流入可写流
  function pipeStream(readStream: fse.ReadStream, writeStream: fse.WriteStream) {
    return new Promise<void>((resolve, reject) => {
      readStream.pipe(writeStream, { end: false });
      readStream.on("error", (err) => {
        reject(err);
      });
      readStream.on("end", () => {
        resolve();
      });
    });
  }
  // 解析POST请求传递的参数
  function resolvePost(req: http.IncomingMessage) {
    // 解析参数
    return new Promise<{ fileName: string; size: number }>((resolve) => {
      let chunk = "";
      req.on("data", (data) => {
        //req接收到了前端的数据
        chunk += data; //将接收到的所有参数进行拼接
      });
      req.on("end", () => {
        resolve(JSON.parse(chunk)); //将字符串转为JSON对象
      });
    });
  }
});
server.listen(3000, () => {
  console.log("服务已启动");
});
