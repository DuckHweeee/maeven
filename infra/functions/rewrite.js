// CloudFront viewer-request function (cloudfront-js-2.0).
//
// `next build` with `output: "export"` writes /magazine as magazine.html and
// /article/<slug> as article/<slug>.html. S3 has no try_files, so map clean
// URLs onto those keys here. Anything with a file extension (/_next/static/…,
// /img/…, the RSC .txt payloads) passes through untouched.
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri === "/" || uri === "") {
    request.uri = "/index.html";
    return request;
  }

  // "/magazine/" -> "/magazine"
  if (uri.length > 1 && uri.charAt(uri.length - 1) === "/") {
    uri = uri.substring(0, uri.length - 1);
  }

  var lastSegment = uri.substring(uri.lastIndexOf("/") + 1);
  if (lastSegment.indexOf(".") === -1) {
    uri = uri + ".html";
  }

  request.uri = uri;
  return request;
}
