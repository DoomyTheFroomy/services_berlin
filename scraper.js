// This is a template for a Node.js scraper on morph.io (https://morph.io)

const cheerio = require('cheerio')
const request = require('request')
const sqlite3 = require('sqlite3').verbose()
const URL = require('url').URL
const db = new sqlite3.Database('data.sqlite')

const baseUrl = 'https://service.berlin.de'

const services = {}

function initDatabase (callback) {
  // Set up sqlite database.
  db.serialize(function () {
    db.run('DROP TABLE "data";', function () {
      db.run('CREATE TABLE IF NOT EXISTS data (id TEXT, title TEXT, description TEXT, Voraussetzungen TEXT, "Erforderliche Unterlagen" TEXT, Formulare TEXT, "Gebühren" Text, Rechtsgrundlagen TEXT, "Weiterführende Informationen" TEXT, "Zuständige Behörden" TEXT)', callback(db))
    })
  })
}

function updateRow (value) {
  console.log('value', value)
  // Insert some data.
  var insert = 'INSERT INTO data (id,title,description,Voraussetzungen,Rechtsgrundlagen,"Erforderliche Unterlagen",Formulare,"Gebühren","Weiterführende Informationen","Zuständige Behörden") VALUES ($id,$title,$description,$Voraussetzungen,$Rechtsgrundlagen,$ErforderlicheUnterlagen,$Formulare,$Gebuehren,$WeiterfuehrendeInformationen,$ZustaendigeBehoerden);'
  db.run(insert, {
    $id: value['id'],
    $title: value['title'],
    $description: value['description'],
    $Voraussetzungen: JSON.stringify(value['Voraussetzungen']),
    $Rechtsgrundlagen: JSON.stringify(value['Rechtsgrundlagen']),
    $ErforderlicheUnterlagen: JSON.stringify(value['Erforderliche Unterlagen']),
    $Formulare: JSON.stringify(value['Formulare']),
    $Gebuehren: JSON.stringify(value['Gebühren']),
    $WeiterfuehrendeInformationen: JSON.stringify(value['Weiterführende Informationen']),
    $ZustaendigeBehoerden: JSON.stringify(value['Zuständige Behörden'])
  })
  // const statement = db.run('INSERT INTO data VALUES ', value)
  // statement.run(value)
  // statement.finalize()
}

function readRows (db) {
  // Read some data.
  db.each('SELECT rowid AS id, name FROM data', function (err, row) {
    console.log(row.id + ': ' + row.name)
  })
}

function fetchPage (url, callback) {
  // Use request to read in pages.
  request(url, function (error, response, body) {
    if (error) {
      console.log('Error requesting page: ' + error)
      return
    }

    callback(body, url)
  })
}

function run (db) {
  // Use request to read in pages.
  fetchPage(baseUrl + '/dienstleistungen', function (body) {
    // Use cheerio to find things in the page with css selectors.
    const $ = cheerio.load(body)

    $('ul.list li.topic-dls a').each(function (i) {
      // if (i > 10) return false
      const href = $(this).attr('href')
      console.log(href)
      setTimeout(() => {
        fetchPage(baseUrl + href, getServiceData)
      }, i * 300)

      // updateRow(db, value)
    })

    // readRows(db)

    // db.close()
  })
}

function getServiceData (body, url) {
  const Url = new URL(url)
  // console.log(Url.pathname)
  const id = Url.pathname.split('/')[2]
  console.log(id)
  // console.log(url)
  const $ = cheerio.load(body)
  const title = $('h1.title').text()
  // const serviceBody = $('div.body.dienstleistung')
  console.log(title)
  // console.log(serviceBody)
  services[id] = {
    id: id,
    title: title
  }

  $('div.body.dienstleistung div.block').each(function (i, elem) {
    if (i === 0) {
      console.log(i, $(this).text().trim())
      services[id]['description'] = $(this).text().trim()
    }
    const topic = $(this).find('h2').text()
    if (topic.length > 0) {
    // console.log(topic)
      services[id][topic] = []
      let title
      let description
      let href
      if (topic === 'Zuständige Behörden') {
        $(this).find('div.behoerdenitem').each(function (index, el) {
          title = $(this).find('strong').text().trim()
          description = $(this).find('p.inner').text().trim()
          href = $(this).find('a').attr('href')
        })
      } else {
        // if ($(this).find('h2').text() === 'Voraussetzungen') {
        $(this).find('li').each(function (index, el) {
          title = ($(this).find('strong').length > 0 ? $(this).find('strong').text().trim() : $(this).text().trim())
          description = $(this).find('div.description').text().trim()
          href = $(this).find('a').attr('href')
          console.log(topic, title, description, $(this).text().trim())
        })
      }
      services[id][topic].push({ title: title, description: description, href: href })
    }
    // }
  })

  console.log(services[id])
  updateRow(services[id])
}

initDatabase(run)
