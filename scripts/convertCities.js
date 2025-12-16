import fs from "fs";
import csv from "csv-parser";

const cities = [];

fs.createReadStream("/Users/spandanmaharana/flavorlens/cities/uscities.csv")
.pipe(csv())
.on("data", (row) => {
    if (row.city && row.state_id){
        cities.push(`${row.city}, ${row.state_id}`);
    }
})
.on("end", () => {
    fs.writeFileSync("/Users/spandanmaharana/flavorlens/app/data/usCities.ts", `export const usCities = ${JSON.stringify(cities, null, 2)};`);
    console.log("US Cities CSV file successfully processed and converted to usCities.ts");
});