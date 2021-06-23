// node.js fetch API polyfill
const fetch = require("node-fetch");

// node.js DOM API polyfill
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

// filesystem node.js module to write files
const fs = require("fs");

// an array of the potential degree/certificate offerings
const POSSIBLE_OFFERINGS = [
    "Bachelor's",
    "Master's",
    "Doctorate",
    "Certificate",
    "Minor"
];

/**
 * Scrape the UMBC Degree Programs page and convert
 */
async function fetchPage() {
    // get the degree programs page HTML
    const response = await fetch("https://www.umbc.edu/degrees/");
    const html = await response.text();

    // get the document from the JSDOM window object to make syntax consistent with browser
    const { document } = (new JSDOM(html)).window;

    // get the first element with the order-table class
    // this represents the UMBC Main Campus programs table
    const table = document.querySelector(".order-table");
    // get all the row elements from the table
    const rows = table.querySelectorAll("tr");

    const degreeOfferings = {};

    // use a while loop so that we can do some index tricks to skip certain rows
    // we start from 1 because we want to skip the header row at index 0
    let index = 1;
    while (index < rows.length)
    {
        // get the current row
        const row = rows[index];

        // most of the times this should short-circuit b/c the well-formed table has a <th> element in the first column
        // however, if that is not the case, we want to fallback and just look for a <td> element
        const titleEl = row.querySelector("th") || row.querySelector("td");
        const title = titleEl.textContent.split("\n")[0];

        // spread the <td> elements into an array to make it iterable
        const cells = [...row.querySelectorAll("td")];

        // make sure not all of the cells are empty (i.e. is a program title row)
        const numOfferings = cells.filter(x => x.textContent != "").length;

        // if the row has enough cells to contain all the potential offerings
        if (numOfferings !== 0)
        {
            const offerings = cells.reduce((a, b, i) => {
                const offeringType = POSSIBLE_OFFERINGS[i];

                // if the degree program has already showed up in the table before, we need to make sure to only change blank values
                if (title in degreeOfferings)
                {
                    // if there is an offering to be added 
                    if (b.textContent)
                    {
                        a[offeringType] = b.textContent;
                    }   
                    // otherwise, carry over the existing value
                    // this is necessary b/c each time reduce is making a new object so we need to make sure we have all the fields
                    else
                    {
                        a[offeringType] = degreeOfferings[title][offeringType];
                    }
                }
                // set the offering value to either the type of offering or false for no offering
                else
                {
                    a[offeringType] = b.textContent || false;
                }
                
                // a minor has no type, so its better to represent it as a true
                if (a[offeringType] == "Minor")
                {
                    a[offeringType] = true;
                }

                // if this program offers a certificate, make it a comma separated list when there's multiple types
                if (offeringType == "Certificate" && a[offeringType] != false)
                {
                    a[offeringType] = a[offeringType].split("\n").map(x => x.trim()).join(", ");
                }

                return a;
            }, {});

            // set the offerings value of the degree program key
            degreeOfferings[title] = offerings;
        }
        
        // analyze the next row
        index += 1;
    }

    // get today's date as a string to mark the data file for future reference
    const today = new Date();
    const todayDateString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

    // write the file to the disk into the data/ folder
    fs.writeFileSync(`data/${todayDateString}.json`, JSON.stringify(degreeOfferings));
}

fetchPage();