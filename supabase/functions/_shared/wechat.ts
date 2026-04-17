import { getEnv } from "./env.ts";

export interface WeChatIdentity {
  unionId: string;
  openId: string;
  platform: "mini_program" | "flutter_app";
}

interface WeChatResponse {
  errcode?: number;
  errmsg?: string;
  openid?: string;
  unionid?: string;
  access_token?: string;
}

async function fetchWeChatJson(url: string): Promise<WeChatResponse> {
  const response = await fetch(url);
  const data = (await response.json()) as WeChatResponse;
  if (!response.ok || data.errcode) {
    throw new Error(data.errmsg || `WeChat request failed: ${response.status}`);
  }
  return data;
}

async function exchangeMiniProgramCode(code: string): Promise<WeChatIdentity> {
  const appId = getEnv("WECHAT_MINI_APP_ID");
  const secret = getEnv("WECHAT_MINI_APP_SECRET");
  const url =
    `https://api.weixin.qq.com/sns/jscode2session?appid=${
      encodeURIComponent(appId)
    }` +
    `&secret=${encodeURIComponent(secret)}` +
    `&js_code=${encodeURIComponent(code)}` +
    "&grant_type=authorization_code";
  const data = await fetchWeChatJson(url);

  if (!data.openid || !data.unionid) {
    throw new Error(
      "Mini program login did not return unionid. Confirm WeChat Open Platform binding is configured.",
    );
  }

  return {
    unionId: data.unionid,
    openId: data.openid,
    platform: "mini_program",
  };
}

async function exchangeFlutterAppCode(code: string): Promise<WeChatIdentity> {
  const appId = getEnv("WECHAT_OPEN_APP_ID");
  const secret = getEnv("WECHAT_OPEN_APP_SECRET");
  const tokenUrl =
    `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${
      encodeURIComponent(appId)
    }` +
    `&secret=${encodeURIComponent(secret)}` +
    `&code=${encodeURIComponent(code)}` +
    "&grant_type=authorization_code";
  const tokenData = await fetchWeChatJson(tokenUrl);

  if (!tokenData.openid) {
    throw new Error("WeChat app login did not return openid.");
  }

  if (tokenData.unionid) {
    return {
      unionId: tokenData.unionid,
      openId: tokenData.openid,
      platform: "flutter_app",
    };
  }

  const userInfoUrl =
    `https://api.weixin.qq.com/sns/userinfo?access_token=${
      encodeURIComponent(tokenData.access_token ?? "")
    }` +
    `&openid=${encodeURIComponent(tokenData.openid)}`;
  const userInfo = await fetchWeChatJson(userInfoUrl);

  if (!userInfo.unionid) {
    throw new Error(
      "WeChat app login did not return unionid. Confirm the app is bound under the same Open Platform account.",
    );
  }

  return {
    unionId: userInfo.unionid,
    openId: tokenData.openid,
    platform: "flutter_app",
  };
}

export async function exchangeWeChatCode(input: {
  platform: "mini_program" | "flutter_app";
  wechatCode: string;
}): Promise<WeChatIdentity> {
  if (!input.wechatCode.trim()) {
    throw new Error("Missing WeChat code.");
  }

  return input.platform === "mini_program"
    ? exchangeMiniProgramCode(input.wechatCode)
    : exchangeFlutterAppCode(input.wechatCode);
}
