import React, { useEffect, useMemo, useRef, useState } from "react";
import { UploadOutlined } from "@ant-design/icons";
import { Button, Progress } from "antd";
import "./assets/css/app.css";
import { IChunkListObj } from "./typings/vite-env";
import axios, { AxiosProgressEvent } from "axios";

const App: React.FC = () => {
  const [chunkList, setChunkList] = useState<IChunkListObj[]>([]);
  const [file, setFile] = useState<File>();
  const size = 2 * 1024 * 1024;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dealFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChunkList([]);
    if (e.currentTarget.files) setFile(e.currentTarget.files[0]);
  };
  const uploadHandle = async () => {
    const onProgress = function (chunk: IChunkListObj) {
      return (e: AxiosProgressEvent) => {
        chunk.percent = Math.round((e.loaded / (e.total as number)) * 100);
        const updateChunkList = [...chunkList];
        setChunkList(updateChunkList);
      };
    };
    const reqsArr = chunkList.map((chunk) => {
      const formData = new FormData();
      formData.append("file", chunk.fileChunk);
      formData.append("fileName", chunk.fileName);
      formData.append("chunkName", chunk.chunkName);
      return new Promise((resolve, reject) => {
        axiosFunction("post", "/api/upload", onProgress(chunk), formData)
          .then((res) => {
            resolve(res);
          })
          .catch((err) => reject(err));
      });
    });
    await Promise.all(reqsArr);
    console.log("完毕");
  };
  useEffect(() => {
    if (file) {
      const newList: IChunkListObj[] = [];
      for (let i = 0; i * size < file.size; i++) {
        newList.push({
          fileChunk: file.slice(i * size, (i + 1) * size),
          size,
          percent: 0,
          chunkName: `${file.name}-${i}`,
          fileName: file.name,
          index: i,
        });
      }
      setChunkList(newList);
    } else {
      setChunkList([]);
    }
  }, [file, size]);
  const totalPercent = useMemo(() => {
    return chunkList.reduce((last, cur) => {
      return last + cur.percent;
    }, 0) / chunkList.length;
  }, [chunkList]);
  const axiosFunction = async (method = "post", url = "/api/upload", onProgress: (e: AxiosProgressEvent) => void, data: unknown) => {
    const res = axios.request({
      method,
      url,
      onUploadProgress: onProgress,
      data,
      headers: {
        "Content-Type": "form-data",
      },
    });
    return res;
  };
  return (
    <div id="app">
      <input type="file" style={{ display: "none" }} ref={inputRef} onChange={dealFile}></input>
      <Button icon={<UploadOutlined />} onClick={() => inputRef.current?.click()}>
        上传文件
      </Button>
      <Button onClick={uploadHandle}>开始上传</Button>
      {file && (
        <div className="info">
          <span className="info">文件名: {file.name}</span>
          <span className="info">文件大小: {(file.size / 1024 / 1024).toFixed(2)} Mb</span>
        </div>
      )}
      <div className="list">
        {chunkList.map((chunk, index) => {
          return (
            <div key={index}>
              <span className="info">{chunk.chunkName}</span>
              <Progress percent={chunk.percent} />
            </div>
          );
        })}
        {
          <div>
            总得: <Progress percent={totalPercent} />
          </div>
        }
      </div>
    </div>
  );
};

export default App;
