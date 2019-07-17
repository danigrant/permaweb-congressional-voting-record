let fetch = require('node-fetch')
let Arweave = require('arweave/web');
require('dotenv').config()

const arweave = Arweave.init({
    host: 'arweave.net',
    port: 80,
    protocol: 'https'
});

const PROPUBLICA_KEY = process.env.PROPUBLICA_KEY

void async function main() {
  let yesterdayVotes = await newBillLast24H()
  if (yesterdayVotes) {
    for (let i = 0; i < yesterdayVotes.length; i++) {

    }
  }
}()

async function newBillLast24H() {
  let res = await fetch('https://api.propublica.org/congress/v1/both/votes/recent.json', { headers: { 'X-API-Key': PROPUBLICA_KEY }})
  let json = await res.json()
  for (let i = 0; i < json["results"]["votes"].length; i++) {
    let voteDate = `${json["results"]["votes"][i]["date"]} ${json["results"]["votes"][i]["time"]}`

    let votesLast24H = []

    // subtraction returns milliseconds and we want days so 1000 milliseconds * 60 seconds * 60 minutes * 24 hrs
    if ((new Date() - new Date(voteDate)) / 1000 / 60 / 60 / 24) {
      votesLast24H.push(json["results"]["votes"][i]["vote_uri"])
    }
    return votesLast24H
  }
  return false
}


async function getVote(voteURI) {

}
