import http from "http";

function fetchEndpoint(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:5150${path}`, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    }).on("error", (err) => {
      reject(err);
    });
  });
}

async function run() {
  const resChapters = await fetchEndpoint("/api/v1/users/leaderboard/chapters");
  console.log("Chapters API response:");
  console.log("Status:", resChapters.statusCode);
  console.log("Body:", resChapters.body);

  const resStudents = await fetchEndpoint("/api/v1/users/leaderboard/students");
  console.log("Students API response:");
  console.log("Status:", resStudents.statusCode);
  console.log("Body:", resStudents.body.substring(0, 500));
}

run().catch(console.error);
