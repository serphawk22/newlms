async function test() {
  const url = "https://res.cloudinary.com/dr9r4fwdp/image/upload/v1779260597/wwznfmtz2775dnqiyukt";

  console.log("Testing image URL without extension...");
  try {
    const res = await fetch(url);
    console.log("Status:", res.status);
    console.log("Headers (x-cld-error):", res.headers.get("x-cld-error"));
    console.log("Content-Type:", res.headers.get("content-type"));
  } catch (e) {
    console.error("Failed:", e);
  }
}

test();
