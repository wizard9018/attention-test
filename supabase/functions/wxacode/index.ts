// 生成微信小程序码：GET /wxacode?ref=55168
// 返回 PNG 图片，扫码后直接打开小程序 pages/home/home?ref=55168
//
// 需要在 Supabase 项目里配置两个 secret（不要写死在代码里）：
//   WX_APPID     小程序 AppID
//   WX_APPSECRET 小程序 AppSecret
// 部署: supabase functions deploy wxacode
// 配置: supabase secrets set WX_APPID=xxx WX_APPSECRET=xxx

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WX_APPID = Deno.env.get("WX_APPID")!;
const WX_APPSECRET = Deno.env.get("WX_APPSECRET")!;

async function getAccessToken(supabase: ReturnType<typeof createClient>): Promise<string> {
  const { data: cached } = await supabase
    .from("wx_token_cache")
    .select("access_token, expires_at")
    .eq("id", 1)
    .maybeSingle();

  if (cached?.access_token && cached.expires_at && new Date(cached.expires_at) > new Date(Date.now() + 5 * 60 * 1000)) {
    return cached.access_token as string;
  }

  const tokenRes = await fetch(
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WX_APPID}&secret=${WX_APPSECRET}`
  );
  const tokenJson = await tokenRes.json();
  if (!tokenJson.access_token) {
    throw new Error("获取 access_token 失败: " + JSON.stringify(tokenJson));
  }

  const expiresAt = new Date(Date.now() + (tokenJson.expires_in - 60) * 1000).toISOString();
  await supabase.from("wx_token_cache").upsert({
    id: 1,
    access_token: tokenJson.access_token,
    expires_at: expiresAt
  });

  return tokenJson.access_token as string;
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const ref = (url.searchParams.get("ref") || "").trim();
  if (!/^\d{5}$/.test(ref)) {
    return new Response(JSON.stringify({ error: "ref 需为5位数字工号" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const accessToken = await getAccessToken(supabase);

    const wxRes = await fetch(
      `https://api.weixin.qq.com/wxa/getwxacode?access_token=${accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "pages/home/home?ref=" + ref,
          width: 400
        })
      }
    );

    const contentType = wxRes.headers.get("content-type") || "";
    if (contentType.indexOf("image") !== -1) {
      const imageBuf = await wxRes.arrayBuffer();
      return new Response(imageBuf, {
        headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" }
      });
    }

    const errJson = await wxRes.json();
    return new Response(JSON.stringify({ error: "微信生成小程序码失败", detail: errJson }), {
      status: 502,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
