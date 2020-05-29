import React from 'react';
import './App.css';

let myInit = {
  method: 'GET',
  mode: 'cors',
  cache: 'default'
};
const url = 'https://aleforall.herokuapp.com';
//const url = 'http://localhost:5001';
const s3Url = 'https://d30jrcrwkxm8hm.cloudfront.net/';

const launchDownload = (fileName='file.csv', csv) => {

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
  const urlPost = url + '/upload/upload-beers';
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
      <label htmlFor="file">Select a fucking csv to update the database data with beers</label>
      <input type="file" id="file" onChange={e => setFile(e?.target?.files?.[0])}/>

    {file && <div>
        <button onClick={uploadFile}>Upload file</button>
    </div>}

    </div>
  );
}

function FetchDB() {
  const urlGet = url + '/beers';
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
          setTimeout(() => {
            el.remove()
          }, 10000);
        });
      });
    }).catch(error => {
    });

  }, [urlGet]);

  return (
    <button onClick={fetchBeers}>
      Fetch all beers from DB (deleted after 10s)
    </button>
  );
}

function UploadImage() {
  const urlSigned = url + '/upload/get-signed-url';
  const urlBeer = url + '/beers'
  const [file, setFile] = React.useState(null);

  const uploadFile = React.useCallback( () => {
    if (!file) {
      return;
    }
    //First let's hit the api for an url
    window.fetch(urlSigned).then(response => {
      response.json().then(json => {
        if (json.url) {
          //then let's hit amazon
          let data = new FormData();
          for (let field in json.fields) {
            data.append(field, json.fields[field]);
          }
          data.append('file', file);
          window.fetch(json.url, {
            method:'POST',
            body: data,
            mode:'cors'
          }).then(response => {
            if (response.status === 204) {
              let picture = json.fields['Key'];
              let name =  'a' + new Date().getTime().toString();
              let fakeBeer = {
                picture,
                name,
                description: 'blabla',
                alcohol: 10,
                brewery: 'truc',
                type: 'blond'
              }
              //let's save everything
              window.fetch(urlBeer, {
                method: 'POST',
                body: JSON.stringify(fakeBeer),
                headers: {
                  'Content-Type': 'application/json'
                },
              }).then((response) => {
                response.json().then(beer => {
                  // let's hit the update now
                  beer.description = 'ALARIC IS THE BEST';
                  window.fetch(urlBeer +'/' + name, {
                    method: 'PUT',
                    body: JSON.stringify(beer),
                    headers: {
                      'Content-Type': 'application/json'
                    },
                  }).then((response) => {
                    response.json().then(beer => {
                      let el = document.createElement('p');
                      el.innerHTML = JSON.stringify(beer);
                      let img = document.createElement('img');
                      img.src = s3Url + beer.picture;
                      document.getElementsByTagName('body')[0].appendChild(el);
                      el.appendChild(img);
                      setTimeout(() => {
                        window.fetch(urlBeer +'/'+name, {
                          method: 'DELETE'
                        }).then((response) => {
                            response.json().then(resp => {
                              console.warn(resp);
                            });
                        });
                      }, 10000);
                    })
                  })

                })
              })
            }
          }).catch(error => {
            console.warn('error ', error);
          });
        }
      })
    });
  }, [file, urlSigned, urlBeer]);


  return (
    <p>
      <div>
        With this button you upload a picture and then try to create a fake beer with random name
        Then we display it  before deleting
        <div/>
        <label htmlFor="file">Select a fucking picture to upload it to the fucking s3</label>
        <input type="file" id="file" onChange={e => setFile(e?.target?.files?.[0])}/>

      {file && <div>
          <button onClick={uploadFile}>Upload file</button>
      </div>}

      </div>
    </p>
  );

}


function GetObject() {
  const urlBeer = url + '/beers/Leffe Blonde'

  const getBeer = React.useCallback( () => {
    //First let's hit the api for an url
    window.fetch(urlBeer).then(response => {
      console.log(response);
      response.json().then(beer => {
        let el = document.createElement('p');
        el.innerHTML = JSON.stringify(beer);
        document.getElementsByTagName('body')[0].appendChild(el);
        setTimeout(() => {
          el.remove();
        }, 10000);
      })
    });
  }, [urlBeer]);


  return (
    <div>
        <button onClick={getBeer}>Get from DB the beer with name: Leffe Blonde</button>
    </div>
  )
}

function UpdateObject() {
  const urlBeer = url + '/beers/Leffe Blonde'

  const updateBeer = React.useCallback( () => {
    //First let's hit the api for an url
     let fakeBeer = {
      picture: 'blabla',
      description: 'blabla' + new Date().getTime().toString(),
      alcohol: 10,
      brewery: 'truc',
      type: 'bidule'
    }
    window.fetch(urlBeer, {
      method: 'PUT',
      body: JSON.stringify(fakeBeer),
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(response => {
      console.log(response);
      response.json().then(beer => {
        let el = document.createElement('p');
        el.innerHTML = JSON.stringify(beer);
        document.getElementsByTagName('body')[0].appendChild(el);
        setTimeout(() => {
          el.remove();
        }, 10000);
      })
    });
  }, [urlBeer]);


  return (
    <div>
        <button onClick={updateBeer}>Update from DB the beer with name: Leffe Blonde with random description from</button>
    </div>
  )
}

function DataUpdateBar() {
  const urlPost = url + '/upload/upload-bars';
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
      <label htmlFor="file">Select a fucking csv to update the database data with bars</label>
      <input type="file" id="file" onChange={e => setFile(e?.target?.files?.[0])}/>

    {file && <div>
        <button onClick={uploadFile}>Upload file</button>
    </div>}

    </div>
  );
}

function FetchDBBar() {
  const urlGet = url + '/bars';
  const fetchBars = React.useCallback(() => {

    window.fetch(urlGet, {
      method:'GET',
      mode: 'cors'
    }).then(response => {
      response.json().then(bars => {
        bars.forEach(bar => {
          let el = document.createElement('p');
          el.innerHTML = JSON.stringify(bar);
          document.getElementsByTagName('body')[0].appendChild(el);
          setTimeout(() => {
            el.remove()
          }, 10000);
        });
      });
    }).catch(error => {
    });

  }, [urlGet]);

  return (
    <button onClick={fetchBars}>
      Fetch all bars from DB (deleted after 10s)
    </button>
  );
}

function launchDownloadJson(jsonArray, exportName='barfinal') {
  let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(jsonArray));
  let downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href",     dataStr);
  downloadAnchorNode.setAttribute("download", exportName + ".json");
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

function getData(dataArray, idArray=[], index=101, jsonArray=[]) {
  console.warn('index =', index);
  let myInit = {
    method: 'POST',
    mode: 'cors',
    cache: 'default',
    headers: {
        'Content-Type': 'application/json',
        'X-Parse-REST-API-Key':'D3ojOXvZ7TPco997fgRFdnucqv7RwoAQMqQU2ciM',
        'X-Parse-Session-Token':'r:10fc71a8512fcde79cf4c17a93c72945',
        'X-Parse-Application-Id':'MoFHgtQmohp5h0tKcicxuy5fzkDmG7Qc669KpZfB'
    }
  };
  myInit.body = JSON.stringify(dataArray[index]);
  window.fetch('https://server.mistergoodbeer.com/parse/functions/getSafeBars', myInit).then(resp => {
    console.warn('in get safe bars =', index);
    if(resp.status !== 200) {
      return setTimeout(() => getData(dataArray, idArray, index, jsonArray), 500);
    }
  resp.json().then(bars => {
    if(bars && bars.result) {
      bars.result.forEach(bar => {
        if (!idArray.includes(bar.objectId)) {
          idArray.push(bar.objectId);
        }
      });
      let promiseArray = [];
      idArray.forEach(id => {
        myInit.body = JSON.stringify({id});
        promiseArray.push(window.fetch('https://server.mistergoodbeer.com/parse/functions/getBarWithBeers', myInit));
      });
      Promise.all(promiseArray).then(responses => {
        console.warn('in get bars with beers =', index);

        let readPromises = []
        responses.forEach(resp => {
          if(resp.status !== 200) {
            return setTimeout(() => getData(dataArray, idArray, index, jsonArray), 500);
          }
          readPromises.push(resp.json());
        });
        Promise.all(readPromises).then(_bars => {
          console.warn('in bars =', index, _bars);
          _bars.forEach(_bar => {
            jsonArray.push(_bar.result);
          });
          if ((index + 1) === dataArray.length) {
            launchDownloadJson(jsonArray);
          } else {
            if (index%1000 === 0) {
              launchDownloadJson(jsonArray, `bar_${index}`);
              jsonArray=[];
            }
            else if (index%50 === 0) {
              launchDownloadJson(jsonArray, `save`);
            }
            setTimeout(() => {
              getData(dataArray, idArray, index+1, jsonArray);
            },300);
          }
        });
      });
    }
  })
 }).catch(e => {
  console.log('error =>', e);
  setTimeout(() => {
    getData(dataArray, idArray, index, jsonArray);
  },2000);
 });

}


function fetchMister() {
  const step = 0.002613359137723762; //Increment for longitude, decrement for latitude
  const longitudeLength = 0.0052678585052490234  ;
  const latitudeLength = 0.003306741819187664;
  const endLongitude = 2.415919;
  const startLongitude = 2.252884;
  const endlLatitude = 48.898581;
  const startLatitude = 48.814777;

  let nbOperation = 0;
  let currentLongitude = startLongitude;
  let currentLatitude = startLatitude;

  //Here build array of parameters for Post getSafeBars
  let dataBody = [];
  while (currentLongitude < endLongitude) {
    currentLatitude += latitudeLength;
    let bodyCurrent = {"geobox":{"northeast":{"latitude":currentLatitude + latitudeLength,"longitude":currentLongitude + longitudeLength},"southwest":{"latitude":currentLatitude,"longitude":currentLongitude}},"limit":20};
    dataBody.push(bodyCurrent);
    if (currentLatitude > endlLatitude) {
      currentLatitude = startLatitude;
      currentLongitude += longitudeLength;
    }
    nbOperation++;
  }
  console.log(nbOperation, currentLongitude, currentLatitude, dataBody);
  getData(dataBody);
}

function Mister() {
  return (
    <div>
      <p>
        <button onClick={fetchMister}>Fetch mister good beer</button>
      </p>
    </div>
  )
}


function UploadMister() {
  const urlPost = url + '/upload/upload-mister';
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
      <label htmlFor="file">Upload CSV Mister</label>
      <input type="file" id="file" onChange={e => setFile(e?.target?.files?.[0])}/>

    {file && <div>
        <button onClick={uploadFile}>Upload file</button>
    </div>}

    </div>
  );
}


function GetObjectBar() {
  const urlBeer = url + '/bars/68f13675-b24e-e67f-9457-0eac99a0010f'
  const getBar = React.useCallback( () => {
    //First let's hit the api for an url
    window.fetch(urlBeer).then(response => {
      console.log(response);
      response.json().then(bar => {
        let el = document.createElement('p');
        el.innerHTML = JSON.stringify(bar);
        document.getElementsByTagName('body')[0].appendChild(el);
        setTimeout(() => {
          el.remove();
        }, 10000);
      })
    });
  }, [urlBeer]);


  return (
    <div>
        <button onClick={getBar}>Get from DB the bar with id: 68f13675-b24e-e67f-9457-0eac99a0010f</button>
    </div>
  )
}

function CreateUser() {
  const urlUsers = url + '/users'
  const [token, setToken] = React.useState(null);
  const [token2, setToken2] = React.useState(null);
  const [token3, setToken3] = React.useState(null);
  const [tokenAdmin, setTokenAdmin] = React.useState(null);
  const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6Imp3dCJ9.eyJzdWIiOiI0MTE1NzA0YS0zMDQ2LTFkNzgtNjI2ZC0xYmFhMzk3ODUwY2UiLCJ1c2VybmFtZSI6ImFsYXJpYyIsImVtYWlsIjoiYWxhcmljaGFkZWYyQGdtYWlsLmNvbSIsImlzQWRtaW4iOmZhbHNlLCJleHAiOjE1OTAyMzUxNTg2MDh9.zjj4NgmHOK9NpH_zbWxLtGkGSQvnhnTtA1vPoBXoNME';
  const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6Imp3dCJ9.eyJzdWIiOiI0MTE1NzA0YS0zMDQ2LTFkNzgtNjI2ZC0xYmFhMzk3ODUwY2UiLCJ1c2VybmFtZSI6ImFsYXJpYyIsImVtYWlsIjoiYWxhcmljaGFkZWYyQGdtYWlsLmNvbSIsImlzQWRtaW4iOmZhbHNlLCJleHAiOjEwMDB9.M79yDInGGlyD3wNBX6QfihIV-8vvwodcKTbc0PEqnFg';
  const admin = '7abef57f-774b-b674-c616-08498071e22e';
  const noAdmin = '05cb2e35-dd9d-1d71-5b42-05856682ce27';
  const noAdmin2 = '1ff5afbf-508c-dbbc-a9d1-73bc31668c17';
  const [ask, setAsk] = React.useState(null);
  const barId = 'c1f7fe78-4627-a94d-95fa-be7eaa89c1da';

  const addUser = React.useCallback( () => {
    //First let's hit the api for an url
     let fakeUser = {
      username: 'alaric',
      email:'alarichadef2@gmail.com',
      password: '?1Alarichadef',
      passwordConfirmed: '?1Alarichadef',
    }
    window.fetch(urlUsers + '/signup', {
      method: 'POST',
      body: JSON.stringify(fakeUser),
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(response => {
      console.log(response);
      response.json().then(token => {
        console.warn('token', token)
        setToken(token);
      });
    });
  }, [urlUsers]);

  const deleteUser = React.useCallback( (token) => {
    let bearer = 'Bearer ' + token;
    window.fetch(urlUsers + '/alarichadef2@gmail.com', {
      method: 'DELETE',
      headers: {
        Authorization: bearer,
        'Content-Type': 'application/json'
      }
    }).then(response => {
      console.log(response);
      response.json().then(response => {
        console.warn('delete', response)
        // setToken(null);
        // setTokenAdmin(null);
      });
    });
  }, [urlUsers]);

  const deleteUserNoToken = React.useCallback( () => {
    window.fetch(urlUsers + '/alarichadef2@gmail.com', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(response => {
      console.log(response);
      response.json().then(response => {
        console.warn('delete', response)
        setToken(null);
      });
    });
  }, [urlUsers]);

  const loginUser = React.useCallback( () => {
    //First let's hit the api for an url
     let fakeUser = {
      email:'alarichadef2@gmail.com',
      password: '?1Alarichadef',
    }
    window.fetch(urlUsers + '/signin', {
      method: 'POST',
      body: JSON.stringify(fakeUser),
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(response => {
      console.log(response);
      response.json().then(token => {
        console.warn('token', token)
        setToken(token);
      });
    });
  }, [urlUsers]);

  const loginUserAdmin = React.useCallback( () => {
    //First let's hit the api for an url
     let fakeUser = {
      email:'alarichadef@gmail.com',
      password: '?1Alarichadef',
    }
    window.fetch(urlUsers + '/signin', {
      method: 'POST',
      body: JSON.stringify(fakeUser),
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(response => {
      console.log(response);
      response.json().then(token => {
        console.warn('token', token)
        setTokenAdmin(token);
      });
    });
  }, [urlUsers]);

  function testToken() {
    let bearer = 'Bearer ' + token.token;
    
    window.fetch(urlUsers + '/test-token', {
      method: 'GET',
      headers: {
        Authorization: bearer,
        'Content-Type': 'application/json'
      }
    }).then(response => {
      console.log(response);
      response.json().then(token => {
        console.warn('token', token)
      });
    });
  }


  const testAddResponsabilityAdmin = React.useCallback( (token, test=null) => {
    let bearer = 'Bearer ' + token;
    window.fetch(urlUsers + '/bar-responsability', {
      method: 'POST',
      body: JSON.stringify({userId: test ? noAdmin2 : noAdmin, barId}),
      headers: {
        Authorization: bearer,
        'Content-Type': 'application/json'
      }
    }).then(response => {
      console.log(response);
      response.json().then(response => {
        console.warn('add ask', response)
        // setToken(null);
        // setTokenAdmin(null);
      });
    });
  }, [urlUsers]);

  const testAddResponsabilitynoAdmin = React.useCallback( (token) => {
    let bearer = 'Bearer ' + token;
    window.fetch(urlUsers + '/bar-responsability', {
      method: 'POST',
      body: JSON.stringify({userId: noAdmin, barId}),
      headers: {
        Authorization: bearer,
        'Content-Type': 'application/json'
      }
    }).then(response => {
      console.log(response);
      response.json().then(response => {
        console.warn('add ask', response)
        // setToken(null);
        // setTokenAdmin(null);
      });
    });
  }, [urlUsers]);


  const testAddResponsabilitynoUser = React.useCallback( (token) => {
    let bearer = 'Bearer ' + token;
    window.fetch(urlUsers + '/bar-responsability', {
      method: 'POST',
      body: JSON.stringify({userId: noAdmin+'a', barId}),
      headers: {
        Authorization: bearer,
        'Content-Type': 'application/json'
      }
    }).then(response => {
      console.log(response);
      response.json().then(response => {
        console.warn('add ask', response)
        // setToken(null);
        // setTokenAdmin(null);
      });
    });
  }, [urlUsers]);

  const testdeleteResponsability = React.useCallback( (token) => {
    let bearer = 'Bearer ' + token;
    window.fetch(urlUsers + '/bar-responsability', {
      method: 'DELETE',
      headers: {
        Authorization: bearer,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({userId: noAdmin, barId})
    }).then(response => {
      console.log(response);
      response.json().then(response => {
        console.warn('delete', response)
        // setToken(null);
        // setTokenAdmin(null);
      });
    });
  }, [urlUsers]);


  const testAskResponsability = React.useCallback( (token) => {
    let bearer = 'Bearer ' + token;
    window.fetch(urlUsers + '/ask-for-bar-responsability', {
      method: 'POST',
      body: JSON.stringify({userId: noAdmin, barId}),
      headers: {
        Authorization: bearer,
        'Content-Type': 'application/json'
      }
    }).then(response => {
      console.log(response);
      response.json().then(response => {
        console.warn('add ask', response)
        setAsk(response.id);
        // setToken(null);
        // setTokenAdmin(null);
      });
    });
  }, [urlUsers]);

  
  const loginUser2 = React.useCallback( () => {
    //First let's hit the api for an url
     let fakeUser = {
      email:'alarichadef3@gmail.com',
      password: '?1Alarichadef',
    }
    window.fetch(urlUsers + '/signin', {
      method: 'POST',
      body: JSON.stringify(fakeUser),
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(response => {
      console.log(response);
      response.json().then(token => {
        console.warn('token', token)
        setToken2(token);
      });
    });
  }, [urlUsers]);

  const loginUser3 = React.useCallback( () => {
    //First let's hit the api for an url
     let fakeUser = {
      email:'alarichadef4@gmail.com',
      password: '?1Alarichadef',
    }
    window.fetch(urlUsers + '/signin', {
      method: 'POST',
      body: JSON.stringify(fakeUser),
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(response => {
      console.log(response);
      response.json().then(token => {
        console.warn('token', token)
        setToken3(token);
      });
    });
  }, [urlUsers]);

  const testAcceptResponsability = React.useCallback( (token) => {
    let bearer = 'Bearer ' + token;
    window.fetch(urlUsers + '/handle-bar-responsability', {
      method: 'POST',
      body: JSON.stringify({userId: noAdmin2, barId, stateRequest: true}),
      headers: {
        Authorization: bearer,
        'Content-Type': 'application/json'
      }
    }).then(response => {
      console.log(response);
      response.json().then(response => {
        console.warn('add ask', response)
        // setToken(null);
        // setTokenAdmin(null);
      });
    });
  }, [urlUsers]);


  return (
    <div>
        <button onClick={addUser}>Add a fake user to db and display token</button>
        {token && <button onClick={() => deleteUser(token.token)}>delete the fake user without admin token</button>}
        {token && <button onClick={loginUser}>login with the fake user</button>}
        <button onClick={loginUserAdmin}>login with the user Admin</button>
        {tokenAdmin && <button onClick={() => deleteUser(tokenAdmin.token)}>delete the fake user with admin token</button>}
        {token && fakeToken && <button onClick={() => deleteUser(fakeToken)}>delete the fake user with fake signature token</button>}
        {token && expiredToken && <button onClick={() => deleteUser(expiredToken)}>delete the fake user with expired token</button>}
        {token && <button onClick={() => deleteUserNoToken()}>delete the fake user without token</button>}
        {token && <button onClick={() => deleteUser(null)}>delete the fake user with a null token</button>}
        {tokenAdmin && <button onClick={() => testAddResponsabilityAdmin(tokenAdmin.token)}>add responsability with admin</button>}
        {token && <button onClick={() => testAddResponsabilitynoAdmin(token.token)}>add responsability with no admin</button>}
        {tokenAdmin && <button onClick={() => testAddResponsabilitynoUser(tokenAdmin.token)}>add responsability with admin but no user</button>}
        {tokenAdmin && <button onClick={() => testdeleteResponsability(tokenAdmin.token)}>delete responsability with admin</button>}
        <button onClick={loginUser2}>login with the fake user 2</button>
        {token2 && <button onClick={() => testAskResponsability(token2.token)}>test ask responsability user 2</button>}
        {tokenAdmin && <button onClick={() => testAddResponsabilityAdmin(tokenAdmin.token, 'ala')}>add responsability user 3 with admin</button>}
        <button onClick={loginUser3}>login with the fake user 3</button>
        {token3 && <button onClick={() => testAskResponsability(token3.token)}>test ask responsability user 3</button>}
        {token3 && tokenAdmin && <button onClick={() => testAcceptResponsability(tokenAdmin.token)}>test accept responsability user 3 admin</button>}
        {token3 && token2 && <button onClick={() => testAcceptResponsability(token2.token)}>test accept responsability user 3 with user 2</button>}
    </div>
  )
}


function App() {
  return (
    <div className="App">
      <Scrapper/>
      <DataUpdate/>
      <FetchDB/>
      <UploadImage/>
      <GetObject/>
      {/* <UpdateObject/> */}
      <DataUpdateBar/>
      <FetchDBBar/>
      <GetObjectBar/>
      <Mister/>
      <UploadMister/>
      <CreateUser/>
    </div>
  );
}

export default App;
