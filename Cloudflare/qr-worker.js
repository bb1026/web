import QRCode from "qrcode";

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname !== "/v1/create-qr-code/") {
      return new Response("Not Found", { status: 404 });
    }

    const data = url.searchParams.get("data");
    if (!data) {
      return new Response("Missing data parameter", { status: 400 });
    }

    const size = parseInt(
      (url.searchParams.get("size") || "300x300").split("x")[0]
    );

    const margin = parseInt(url.searchParams.get("margin") || "1");
    const format = (url.searchParams.get("format") || "png").toLowerCase();

    const ecc = url.searchParams.get("ecc") || "M";
    const color = "#" + (url.searchParams.get("color") || "000000");
    const bgcolor = "#" + (url.searchParams.get("bgcolor") || "ffffff");

    const options = {
      width: size,
      margin,
      errorCorrectionLevel: ecc,
      color: {
        dark: color,
        light: bgcolor
      }
    };

    // SVG
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

    // PNG
    try {
      const png = await QRCode.toBuffer(data, options);

      return new Response(png, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public,max-age=86400"
        }
      });
    } catch (err) {
      return new Response(err.message, { status: 500 });
    }
  }
};