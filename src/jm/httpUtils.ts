import CryptoJS from "crypto-js";
import { version } from "./version";

let d1 = new Date();
let gmtTime = new Date(d1.toUTCString());
let time = Math.floor(gmtTime.getTime() / 1000);
export let tokenParam = time + "," + version;
export let token = CryptoJS.MD5(String(time) + "185Hcomic3PAPP7R").toString();

export const tryDecryption = async (response: Response, url: string) => {
  const responseObj = await response.json();
  const possibleKeys = ["185Hcomic3PAPP7R", "18comicAPPContent"];
  let decryptionSuccessful = false;
  const adKey = ["ad_content_all", "advertise_all"];
  const searchTerm = adKey.some((term) => url.includes(term));
  for (const key of possibleKeys) {
    const keyToTry = searchTerm
      ? CryptoJS.MD5(key).toString()
      : CryptoJS.MD5(time + key).toString();
    const keyObj = CryptoJS.enc.Utf8.parse(keyToTry);
    try {
      const decrypt = CryptoJS.AES.decrypt(responseObj.data, keyObj, {
        mode: CryptoJS.mode.ECB,
      });
      const decryptedData = decrypt.toString(CryptoJS.enc.Utf8);

      try {
        responseObj.data = JSON.parse(decryptedData);
        decryptionSuccessful = true;
        break;
      } catch (e) {}
    } catch (e) {}
  }
  if (!decryptionSuccessful) {
    responseObj.data = "";
  }
  console.debug("req: ", url, responseObj);
  return responseObj;
};
