import React from 'react';
import './App.css';

const url='http://www.bierebel.com'

function launchScrap(start=0, end=1, csvParam='') {

  let csv = csvParam;

  let myInit = { 
    method: 'GET',
    mode: 'cors',
    cache: 'default'
  };
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
  
                let description = beer.querySelectorAll('body #main .container .row .col-sm-9 .row p')?.[1];
                rowContent.push(description ? description.innerText : 'no-description');
                beer.remove();
                rowContent = rowContent.join(";");
                csv += rowContent + "\r\n";
              }
            });
          }).finally(() => {
            if (end === 26) {
              console.warn('Launch download');
              let blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              let downloadLink = document.createElement("a");
              downloadLink.download = 'file.csv';
              downloadLink.href = window.URL.createObjectURL(blob);
              downloadLink.style.display = "none";
              document.body.appendChild(downloadLink);
              downloadLink.click();
            } else {
              launchScrap(start+1, end+1, csv);
            }
          });
        });
    });
  });
}

function ScrapBierebel() {
  return (
    <div>
      Hello here we are gonna scrap bierebel
      <button onClick={() => launchScrap()}> Launch scrap</button>
    </div>
  )
}

function App() {
  return (
    <div className="App">
      <ScrapBierebel/>
    </div>
  );
}

export default App;
