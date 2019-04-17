const got = require('got')
const cheerio = require('cheerio')
const fs = require('fs')
const admin = require('firebase-admin')

// Initialize Firestore
const serviceAccount = require('./chordapp-1905d-firebase-adminsdk-sy9ql-c62c2cca9b.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://chordapp-1905d.firebaseio.com'
});

const db = admin.firestore()
// Initialize firestore collection ref
const colRef = db.collection('songs')

const tabURL = process.argv[2]

// Declare global data object to hold our tabulature info
let data = {
	songName: '',
	artist: '',
	chords: {
		web: '',
		mobile: '',
	}
}

const getTabs = async(url) => {
	if(url) {
		try {
			const response = await got(url);
			let content = response.body
			return content
		} catch (error) {
		}
	} else {
		console.log('Error: Please add a valid ultimate-guitar tab url as an argument.')
		return
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

				parseChordsWeb(chords) // Parses Chords for Web (uses <span>'s and <br>'s)
				// parseChordsMobile(chords) // Parses Chords for Mobile / React Native (uses <Text>'s and {"\n"}'s)

			}
		})
	}).catch((error) => {
	})

const parseChordsWeb = (chords) => {
	let parsedChords
	// Replace various ugly regular expressions from the guitar tab data
	parsedChords = chords.replace(/\\n/g, "<br />")
	parsedChords = parsedChords.replace(/\[ch\]/g, '<span class="chord">')
	parsedChords = parsedChords.replace(/\[\\\/ch\]/g, '</span>')
	parsedChords = parsedChords.replace(/\\r/g, '')
	parsedChords = parsedChords.replace(/\\t/g, '')
	parsedChords = parsedChords.replace(/\\/g, '')
	data.chords.web = parsedChords

	// Write to firestore database
	let docRef = colRef.doc(data.songName)
	docRef.set({
		songName: data.songName,
		artist: data.artist,
		webChords: data.chords.web
	}, {merge:true})

}

const parseChordsMobile = (chords) => {
	let parsedChords
	// Replace various ugly regular expressions from the guitar tab data
	parsedChords = chords.replace(/\\n/g, '{"\\n"}')
	parsedChords = parsedChords.replace(/\[ch\]/g, '<Text style={styles.chord}>')
	parsedChords = parsedChords.replace(/\[\\\/ch\]/g, '</Text>')
	parsedChords = parsedChords.replace(/\\r/g, '')
	parsedChords = prasedChords.replace(/\\t/g, '')
	parsedChords = parsedChords.replace(/\\/g, '')
	data.chords.mobile = parsedChords

	// Write to firestore database
	let docRef = colRef.doc(data.songName)
	docRef.set({
		songName: data.songName,
		artist: data.artist,
		mobileChords: data.chords.mobile
	}, {merge:true})

}
