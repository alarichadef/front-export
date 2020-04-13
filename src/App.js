import React from 'react';
import './App.css';

let myInit = {
  method: 'GET',
  mode: 'cors',
  cache: 'default'
};
const url = 'https://aleforall.herokuapp.com';

const launchDownload = (fileName='file.csv', csv) => {
  console.warn('launch download');
  let blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  let downloadLink = document.createElement("a");
  downloadLink.download = fileName;
  downloadLink.href = window.URL.createObjectURL(blob);
  downloadLink.style.display = "none";
  document.body.appendChild(downloadLink);
  downloadLink.click();
};

function launchGuide() {
  let csv = '';
  const url = 'https://www.guide-biere.fr/deguster/M_toutes.php';
  window.fetch(url, myInit).then(response => {
    response.text().then(text => {
      let el = document.createElement( 'html');
      el.innerHTML = text;
      let beers = el.querySelectorAll('.scrollContainer tr');
      beers.forEach(beer => {
        let rowContent = [];
        let columns = beer.querySelectorAll('td');
        if (columns.length) {
          //Name
          rowContent.push(columns[0].innerText.trim());
          //Image => Just for keeping the same csv structure between scraps
          rowContent.push('no-picture');
          //brewery
          rowContent.push(columns[5].innerText.trim());
          //alcohol
          rowContent.push(columns[4].innerText.trim());
          //type
          rowContent.push(columns[8].innerText.trim());
          //description
          rowContent.push(columns[6].innerText.trim());
          rowContent = rowContent.join(";");
          csv += rowContent + "\r\n";
        }
      });
      el.remove();
      launchDownload('guide-biere.csv', csv);
     });
  })
}


function launchScrap(start=0, end=1, csvParam='') {
  const url='http://www.bierebel.com';

  let csv = csvParam;

  // ABCDEFGHIJKLMNOPQRSTUVWXYZ
  let promiseArray = [];
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.substring(start, end).split('').forEach(letter => {
      promiseArray.push(window.fetch(`http://www.bierebel.com/bieres-belges/all?letter=${letter}`, myInit));
    });
    Promise.all(promiseArray).then(responses => {
      let readPromises = [];
      responses.forEach(r => {
        readPromises.push(r.text());
      });
      Promise.all(readPromises).then(allPages => {
        //allPages.forEach(page => {
          let promiseBeersPage = [];
          allPages.forEach(page => {
            let el = document.createElement( 'html');
            el.innerHTML = page;
            let beerTable = el.querySelector('#beers-table');
            if (beerTable) {
              let rows = beerTable.querySelectorAll('tbody tr');
              rows.forEach(row => {
                let columns = row.querySelectorAll('td');
                if (columns.length) {
                  let urlBeer = row.querySelector('td a');
                  if (urlBeer && urlBeer.pathname) {
                    //Scrap fucking page with detailed informations about the beer
                    promiseBeersPage.push(window.fetch(`${url}${urlBeer.pathname}`));
                  }
                }
              });
              beerTable.remove();
            }
        });
        Promise.all(promiseBeersPage).then(beersPage => {
          let promiseBeers = [];
          beersPage.forEach(beerPage => {
            promiseBeers.push(beerPage.text());
          });
          Promise.all(promiseBeers).then(beersElement => {
            beersElement.forEach(beerElement => {
              let beer = document.createElement( 'html');
              beer.innerHTML = beerElement;
  
              let rowContent = [];

              let name = beer.querySelector('body #main h1')?.innerText.split('»')[1];
              if (name) {
                rowContent.push(name);
  
                let image = beer.querySelector('body #main .container .row img');
                rowContent.push(image ? image.src.replace(document.location.origin, url) : 'no-image');
  
                let brewery = beer.querySelector('body #main .container .row a');
                rowContent.push(brewery ? brewery.innerText : 'no-brewery');
  
                let alcohol = beer.querySelectorAll('body #main .container .row .table td')?.[3];
                rowContent.push(alcohol ? alcohol.innerText.slice(0, -1) : 'no-alcohol');

                let type = beer.querySelectorAll('body #main .container .row .table td')?.[5];
                rowContent.push(type ? type.innerText : 'no-type');
  
                let description = beer.querySelectorAll('body #main .container .row .col-sm-9 .row p')?.[1];
                rowContent.push(description ? description.innerText : 'no-description');
                beer.remove();
                rowContent = rowContent.join(";");
                csv += rowContent + "\r\n";
              }
            });
          }).finally(() => {
            if (end === 26) {
              launchDownload('bierebel.csv', csv);
            } else {
              launchScrap(start+1, end+1, csv);
            }
          });
        });
    });
  });
}

function Scrapper() {
  return (
    <div>
      <div>
        Hello here we are gonna scrap bierebel
        <button onClick={() => launchScrap()}> Launch scrap</button>
      </div>
      <div>
        Fuck off let's scrap guide de la fucking biere
        <button onClick={() => launchGuide()}>Launch scrap guide de la biere</button>
      </div>
    </div>
  )
}

function DataUpdate() {
  const urlPost = url + '/upload-beers';
  const [file, setFile] = React.useState(null);

  const uploadFile = React.useCallback( () => {
    if (!file) {
      return;
    }
    let data = new FormData();
    data.append('file', file);
    window.fetch(urlPost, {
      method:'POST',
      body: data,
      mode: 'cors'
    }).then(response => {
      console.warn(response);
    }).catch(error => {

    });
  }, [file, urlPost]);


  return (
    <div>
      <label htmlFor="file">Select a fucking csv to update the database data</label>
      <input type="file" id="file" onChange={e => setFile(e?.target?.files?.[0])}/>

    {file && <div>
        <button onClick={uploadFile}>Upload file</button>
    </div>}

    </div>
  );
}

function FetchDB() {
  const urlGet = url + '/list-beers';
  const fetchBeers = React.useCallback(() => {

    window.fetch(urlGet, {
      method:'GET',
      mode: 'cors'
    }).then(response => {
      response.json().then(beers => {
        beers.forEach(beer => {
          let el = document.createElement('p');
          el.innerHTML = JSON.stringify(beer);
          document.getElementsByTagName('body')[0].appendChild(el);
        });
      });
    }).catch(error => {
    });

  }, [urlGet]);

  return (
    <button onClick={fetchBeers}>
      Fetch all beers from DB
    </button>
  );
}

function App() {
  return (
    <div className="App">
      <Scrapper/>
      <DataUpdate/>
      <FetchDB/>
    </div>
  );
}

export default App;
