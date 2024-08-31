// Import stylesheets
import "./style.css";
import axios, { AxiosProgressEvent, AxiosResponse } from "axios";

interface IChunkListObj {
  fileChunk: Blob; //使用slice()进行切片
  size: number;
  percent: number;
  chunkName: string;
  fileName: string;
  index: number;
}
interface AxiosRequestConfig {
  method?: string;
  url: string;
  data?: any;
  onProgress?: (e: AxiosProgressEvent) => void;
}

let input = document.getElementById("input");
let upload = document.getElementById("upload");
let file: File; //创建一个文件对象
let chunkList: Array<IChunkListObj>; //存放切片的数组

//读取文件
input.addEventListener("change", (e) => {
  file = (e.target as HTMLInputElement).files[0];
  console.log(file);
  // 创建切片
  function createChunk(file: File, size = 2 * 1024 * 1024): Array<IChunkListObj> {
    //两个形参：file是大文件，size是切片的大小
    const chunkList = [];
    let cur = 0,
      index = 0;
    while (cur < file.size) {
      chunkList.push({
        fileChunk: file.slice(cur, cur + size), //使用slice()进行切片
        size: file.slice(cur, cur + size).size,
        percent: 0,
        chunkName: `${file.name}-${index}`,
        fileName: file.name,
        index: index++,
      });
      cur += size;
    }
    return chunkList;
  }
  chunkList = createChunk(file);
  //创建切片
  //上传切片
});

//数据处理
async function uploadFile(list: IChunkListObj[]) {
  const requestList = list
    .map(({ fileChunk, fileName, index, chunkName }) => {
      const formData = new FormData(); // 创建表单类型数据
      formData.append("file", fileChunk); //该文件
      formData.append("fileName", fileName); //文件名
      formData.append("chunkName", chunkName); //切片名
      return { formData, index };
    })
    .map(({ formData, index }) =>
      axiosRequest({
        method: "post",
        url: "/api/upload", //请求接口，要与后端一一一对应
        data: formData,
        onProgress: createProgressHandler(chunkList[index]),
      }).then((_res) => {
        let p = document.createElement("p");
        p.innerHTML = `${list[index].chunkName}--${list[index].percent}`;
        document.getElementById("progress").appendChild(p);
      })
    );
  await Promise.all(requestList); //保证所有的切片都已经传输完毕
  merge(file.size, file.name);
  // 通知后端去做切片合并
  function merge(size: number, fileName: string) {
    axiosRequest({
      method: "post",
      url: "/api/merge", //后端合并请求
      data: JSON.stringify({
        size,
        fileName,
      }),
    });
  }
}
function createProgressHandler(item: IChunkListObj) {
  return (e: AxiosProgressEvent) => {
    item.percent = parseInt(String((e.loaded / e.total) * 100));
  };
}

//请求函数
function axiosRequest({ method = "post", url, data, onProgress = (e) => e }: AxiosRequestConfig) {
  return new Promise<AxiosResponse>((resolve, _reject) => {
    axios
      .request({
        method,
        data,
        url,
        onUploadProgress: onProgress,
      })
      .then((res: AxiosResponse) => {
        resolve(res);
      });
  });
}
// 文件上传
upload.addEventListener("click", () => {
  //发请求，调用函数
  uploadFile(chunkList);
});
