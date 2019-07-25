/*
*
*  Runs every 24 hours as an aws lambda chron
*  Archives all US congressional voting to the Arweave archival network
*  https://www.arweave.org/
*
*/

/*
*  TODO:
*  1. why does it still upload xml with original stylesheet link?
*  2. why does the first txn happen 4 times?
*  3. build a ui that queries arweave with arql and shows a list of txns from this project
*/

let fetch = require('node-fetch')
const Arweave = require('arweave/node');
const { key } = require('./arweave-wallet')
require('dotenv').config()

const PROPUBLICA_KEY = process.env.PROPUBLICA_KEY

// init Arweave
const arweave = Arweave.init({
  host: 'arweave.net',
  port: 443,
  protocol: 'https'
});

void async function main() {
  // get all votes that happened in the last 24 hours
  let votesLast24H = await newVoteLast24H()

  // if any votes happened in the last 24 hours, push the official voting page to Arweave
  if (votesLast24H) {
    for (let i = 0; i < votesLast24H.length; i++) {
      pushToArweave(votesLast24H[i])
    }
  }
}()

// check if a vote happened in last 24 hours
async function newVoteLast24H() {
  // get most recent votes
  let res = await fetch('https://api.propublica.org/congress/v1/both/votes/recent.json', { headers: { 'X-API-Key': PROPUBLICA_KEY }})
  let json = await res.json()

  // an array of uris of votes that happened in last 24 hours
  let votesLast24H = []

  // check if any of the recent votes happened in the last 24 hours and if yes, push it to votesLast24H[]
  for (let i = 0; i < json["results"]["votes"].length; i++) {
    let voteDate = `${json["results"]["votes"][i]["date"]} ${json["results"]["votes"][i]["time"]}`

    // see if vote date is within 24 hours of current date
    // the mathemagics here with /1000/60/60/24 is because the date subtraction returns time in milliseconds
    // and we want time returned in days so we do 1000 milliseconds * 60 seconds * 60 minutes * 24 hrs
    if ((new Date() - new Date(voteDate)) / 1000 / 60 / 60 / 24) {
      votesLast24H.push(json["results"]["votes"][i]["url"])
    }
  }

  // if no votes within last 24 hours, return false
  // otherwise return the array of votes
  if (votesLast24H.length > 0) {
    return votesLast24H
  } else {
    return false
  }
}

async function pushToArweave(uri) {
  // fetch the source code of the page to archive
  let data = await getSourceFromWebPage(uri)

  data = await replaceStyleSheet(data)

  // create transaction
  let transaction = await arweave.createTransaction({
    data: Buffer.from(data, 'utf8')
  }, key);

  // tag the transaction so it can be found later
  transaction.addTag('dani_project', 'congressional_archive')

  // sign the transaction
  await arweave.transactions.sign(transaction, key);

  // then send it to arweave
  const response = await arweave.transactions.post(transaction);

  // return transaction id. data will be hosted at arweave.net/transaction-id
  let transactionId = JSON.parse(response.config.data)["id"]
  console.log(`https://arweave.net/${transactionId}`);
  return transactionId
}

async function getSourceFromWebPage(uri) {
  let res = await fetch(uri)
  return await res.text()
}

// if this is xml because it's a house vote we need to do some stylesheet maneuvering
// parse the xml to grab the stylesheet link
// upload the stylesheet to Arweave
// then replace the stylesheet link with the arweave link so it doesn't 404
// return the updated stylesheet
async function replaceStyleSheet(originalXML) {
  try {
    let uri = originalXML.split('?xml-stylesheet')[1].split('href=')[1].split('"')[1]
    let transactionId = await pushToArweave(uri)

    // swap the stylesheet link in the original xml with the new arweave link
    let newXML = originalXML.replace(uri, `arweave.net/${transactionId}`)
    return newXML
  } catch (error) {
    return originalXML
  }
}
