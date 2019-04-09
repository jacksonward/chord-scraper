const got = require('got')
const cheerio = require('cheerio')
const fs = require('fs')

const tabURL = 'https://tabs.ultimate-guitar.com/tab/bob_dylan/im_a_fool_to_want_you_chords_1864894'

// Declare global data object to hold our tabulature info
let data = {
	songName: '',
	artist: '',
	chords: ''
}

const getTabs = async(url) => {
	try {
		const response = await got(url);
		let content = response.body
		return content
	} catch (error) {
		console.log(error.response.body);
		//=> 'Internal server error ...'
	}
};

getTabs(tabURL)
	.then((content) => {
		let $ = cheerio.load(content)
		let scripts = $('script').map((i, el) => {
			if (el.children[0].data.includes('store.page')) {

				// NOTE that 'store' is actually a string containing relevant tab data, not an object
				let store = el.children[0].data

				const getInfo = () => {
					// declare the bounding strings that we want to search for in the data
					let startString = '"song_name"'
					let endString = '"type"'
					// get indices of strings that contain data we want
					let startIndex = store.indexOf(startString)
					let endIndex = store.indexOf(endString)
					// Some magic to crop the store down to just the song info
					let info = store.substring(startIndex, endIndex - 1)
					// turn into valid json string
					info = `{${info}}`
					info = JSON.parse(info)

					data.songName = info.song_name
					data.artist = info.artist_name

					console.log(data)

				}

				const getChords = () => {
					// declare the bounding strings that we want to search for in the data
					let startString = '"content"'
					let endString = '"revision_id"'
					// get indices of strings that contain data we want
					let startIndex = store.indexOf(startString)
					let endIndex = store.indexOf(endString)
					// Some magic to crop the store down to just the song chords
					let chords = store.substring(startIndex + startString.length + 2, endIndex - 2)
					
					return chords
				}
				getInfo()
				let chords = getChords()

				parseChords(chords)
			}
		})
	}).catch((error) => {
		(console.log('error getting doc: ' + error))
	})

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

const parseChords = (chords) => {

	// Replace various ugly regular expressions from the guitar tab data
	parsedChords = chords.replace(/\\n/g, "<br />")
	parsedChords = parsedChords.replace(/\[ch\]/g, '<span class="chord">')
	parsedChords = parsedChords.replace(/\[\\\/ch\]/g, '</span>')
	parsedChords = parsedChords.replace(/\\/g, '')
	data.chords = parsedChords

	fs.writeFile('./test/test.html', `<!DOCTYPE html>
<html>
<head>
	<title>Test for Scraper</title>
	<link rel="stylesheet" type="text/css" href="test.css">
</head>
<body>
	<h2>${data.songName}</h2>
	<h3>${data.artist}</h3>
	<pre>${data.chords}</pre>
</body>
</html>`, (error) => {
	if (error) {
		console.log("got error: " + error)
	}
})
}