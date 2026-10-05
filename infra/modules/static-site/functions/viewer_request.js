// CloudFront viewer-request function (cloudfront-js-2.0).
//
// 1. www.<host> -> 301 to https://<host><uri>?<same query string>.
// 2. `next build` with `output: "export"` writes /magazine as magazine.html and
//    /article/<slug> as article/<slug>.html. S3 has no try_files, so map clean
//    URLs onto those keys here. Anything with a file extension (/_next/static/…,
//    /img/…, the RSC .txt payloads) passes through untouched.
//
// Query values are copied back exactly as the event gives them. AWS's CloudFront
// Functions docs (functions-event-structure, functions-javascript-runtime-20)
// say only that the event object "automatically parses" the query string; they
// do not say whether values arrive percent-decoded. Re-encoding a value that is
// still encoded would corrupt it (%20 -> %2520), so no encodeURIComponent here
// until a test on a real distribution shows the values are decoded.
function buildQueryString(querystring) {
  var parts = [];
  for (var key in querystring) {
    var entry = querystring[key];
    if (entry.multiValue) {
      for (var i = 0; i < entry.multiValue.length; i++) {
        parts.push(key + "=" + entry.multiValue[i].value);
      }
    } else if (entry.value === "") {
      parts.push(key);
    } else {
      parts.push(key + "=" + entry.value);
    }
  }
  return parts.length > 0 ? "?" + parts.join("&") : "";
}

function handler(event) {
  var request = event.request;
  var host = request.headers.host ? request.headers.host.value : "";

  if (host.substring(0, 4).toLowerCase() === "www.") {
    return {
      statusCode: 301,
      statusDescription: "Moved Permanently",
      headers: {
        location: {
          value:
            "https://" +
            host.substring(4) +
            request.uri +
            buildQueryString(request.querystring),
        },
      },
    };
  }

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
