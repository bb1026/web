import QRCode from "qrcode";

export default {
  async fetch(request) {
    try {
      const url = new URL(request.url);

      const data = url.searchParams.get("data");
      if (!data) {
        return new Response("Missing parameter: data", {
          status: 400,
          headers: {
            "Content-Type": "text/plain; charset=utf-8"
          }
        });
      }

      const sizeParam = url.searchParams.get("size") || "300x300";
      const margin = parseInt(url.searchParams.get("margin") || "1", 10);
      const format = (url.searchParams.get("format") || "png").toLowerCase();
      const ecc = (url.searchParams.get("ecc") || "M").toUpperCase();

      const color = "#" + (url.searchParams.get("color") || "000000").replace("#", "");
      const bgcolor = "#" + (url.searchParams.get("bgcolor") || "ffffff").replace("#", "");

      const width = parseInt(sizeParam.split("x")[0], 10) || 300;

      const options = {
        width,
        margin,
        errorCorrectionLevel: ["L", "M", "Q", "H"].includes(ecc) ? ecc : "M",
        color: {
          dark: color,
          light: bgcolor
        }
      };

      // SVG输出
      if (format === "svg") {
        const svg = await QRCode.toString(data, {
          ...options,
          type: "svg"
        });

        return new Response(svg, {
          headers: {
            "Content-Type": "image/svg+xml",
            "Cache-Control": "public,max-age=86400"
          }
        });
      }

      // PNG输出
      const png = await QRCode.toBuffer(data, options);

      return new Response(png, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public,max-age=86400"
        }
      });
    } catch (err) {
      return new Response(
        JSON.stringify({
          success: false,
          error: err.message
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }
  }
};
