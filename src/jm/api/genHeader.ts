import { token, tokenParam } from "../httpUtils";

export function genHeaders() {
  const jwttoken = JSON.parse(localStorage.getItem("jwttoken") as string) || "";
  const memberInfo =
    JSON.parse(localStorage.getItem("memberInfo") as string) || "";
  return {
    Tokenparam: tokenParam,
    Token: token,
    Authorization: jwttoken ? `Bearer ${jwttoken}` : "",
    Cookie: memberInfo ? `AVS=${memberInfo?.s}` : "",
  };
}
