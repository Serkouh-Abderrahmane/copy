const https = require("https");
https.get("https://luonvuituoi-production.up.railway.app/", res => {
  let d = "";
  res.on("data", c => d += c.toString());
  res.on("end", () => {
    const regex = /src="([^"]*\.(png|jpg|jpeg|webp)[^"]*)"/gi;
    const matches = [];
    let m;
    while ((m = regex.exec(d)) !== null) {
      matches.push(m[1]);
    }
    console.log("Image URLs found:", matches.length);
    matches.slice(0, 25).forEach(u => console.log("  ", u));
  });
});
