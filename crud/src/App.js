// import React, { useState, useEffect, useRef } from 'react';
// import Country from './components/Country';
// import NewCountry from './components/NewCountry';
// import './App.css';
// import axios from "axios";
//
// const App = () => {
//   const [ countries, setCountries ] = useState([]);
//   // const apiEndpoint = "https://cmccurrie-medalsapi.azurewebsites.net/api/country";
//   const apiEndpoint = "https://localhost:5001/jwt/api/country";
//   const hubEndpoint = "https://localhost:5001/medalsHub"
//
//   const medals = useRef([
//     { id: 1, name: 'gold' },
//     { id: 2, name: 'silver' },
//     { id: 3, name: 'bronze' },
//   ]);
//
//   // this is the functional equivalent to componentDidMount
//   useEffect(() => {
//     // initial data loaded here
//     let fetchedCountries = [
//       { id: 1, name: 'United States', gold: 2, silver: 2, bronze: 3 },
//       { id: 2, name: 'China', gold: 3, silver: 1, bronze: 0 },
//       { id: 3, name: 'Germany', gold: 0, silver: 2, bronze: 2 },
//     ]
//     setCountries(fetchedCountries);
//   }, []);
//
//   const handleAdd = async (name) => {
//     // const id = countries.length === 0 ? 1 : Math.max(...countries.map(country => country.id)) + 1;
//     // setCountries([...countries].concat({ id: id, name: name, gold: 0, silver: 0, bronze: 0 }));
//     const {data: post} = await axios.post(apiEndpoint, {name: name});
//     setCountries(countries.concat(post));
//   }
//   const handleDelete = async (countryId) => {
//     // setCountries([...countries].filter(c => c.id !== countryId));
//     const originalCountries = countries;
//     setCountries(countries.filter(c => c.id !== countryId));
//     try {
//       await axios.delete(`${apiEndpoint}/${countryId}`);
//     } catch (ex) {
//       if (ex.response && ex.response.status === 404) {
//         console.log("Record not found")
//       } else {
//         alert('An error has occurred');
//         setCountries(originalCountries);
//       }
//     }
//   }
//   const handleIncrement = (countryId, medalName) => {
//     const idx = countries.findIndex(c => c.id === countryId);
//     const mutableCountries = [...countries ];
//     mutableCountries[idx][medalName] += 1;
//     setCountries(mutableCountries);
//   }
//   const handleDecrement = (countryId, medalName) => {
//     const idx = countries.findIndex(c => c.id === countryId);
//     const mutableCountries = [...countries ];
//     mutableCountries[idx][medalName] -= 1;
//     setCountries(mutableCountries);
//   }
//   const getAllMedalsTotal = () => {
//     let sum = 0;
//     medals.current.forEach(medal => { sum += countries.reduce((a, b) => a + b[medal.name], 0); });
//     return sum;
//   }
//   return (
//       <React.Fragment>
//         <div className='appHeading'>
//           Olympic Medals
//           <span className='badge'>
//           { getAllMedalsTotal() }
//         </span>
//         </div>
//         <div className='countries'>
//           { countries.map(country =>
//               <Country
//                   key={ country.id }
//                   country={ country }
//                   medals={ medals.current }
//                   onDelete={ handleDelete }
//                   onIncrement={ handleIncrement }
//                   onDecrement={ handleDecrement } />
//           )}
//         </div>
//         <NewCountry onAdd={ handleAdd } />
//       </React.Fragment>
//   );
// }
//
// export default App;

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { HubConnectionBuilder } from '@microsoft/signalr';
import Country from './components/Country';
import NewCountry from './components/NewCountry';
import './App.css';
import Login from "./components/Login";
import { BrowserRouter as Router, Route, Link } from 'react-router-dom';
import jwtDecode from "jwt-decode";

const App = () => {
  // const apiEndpoint = "https://localhost:5001/api/country";
  const apiEndpoint = "https://localhost:5001/jwt/api/country";
  const hubEndpoint = "https://localhost:5001/medalsHub"
  const usersEndpoint = "https://localhost:5001/api/users/login";

  // const apiEndpoint = "https://medalsapi.azurewebsites.net/api/country";
  // const apiEndpoint = "https://medalsapi.azurewebsites.net/jwt/api/country";
  // const hubEndpoint = "https://medalsapi.azurewebsites.net/medalsHub"
  const [ countries, setCountries ] = useState([]);
  const [ connection, setConnection] = useState(null);
  const medals = useRef([
    { id: 1, name: 'gold' },
    { id: 2, name: 'silver' },
    { id: 3, name: 'bronze' },
  ]);

  const [ user, setUser ] = useState(
      {
        name: null,
        canPost: false,
        canPatch: false,
        canDelete: false
      }
  );
  const latestCountries = useRef(null);
  // latestCountries.current is a ref variable to countries
  // this is needed to access state variable in useEffect w/o dependency
  latestCountries.current = countries;

  // this is the functional equivalent to componentDidMount
  useEffect(() => {
    // initial data loaded here
    async function fetchCountries() {
      const { data : fetchedCountries } = await axios.get(apiEndpoint);
      setCountries(fetchedCountries);
    }
    fetchCountries();

    const encodedJwt = localStorage.getItem("token");
    // check for existing token
    if (encodedJwt) {
      setUser(getUser(encodedJwt));
    }

    // signalR
    const newConnection = new HubConnectionBuilder()
        .withUrl(hubEndpoint)
        .withAutomaticReconnect()
        .build();

    setConnection(newConnection);
  }, []);
  // componentDidUpdate (changes to connection)
  useEffect(() => {
    if (connection) {
      connection.start()
          .then(() => {
            console.log('Connected!')

            connection.on('ReceiveAddMessage', country => {
              console.log(`Add: ${country.name}`);
              let mutableCountries = [...latestCountries.current];
              mutableCountries = mutableCountries.concat(country);

              setCountries(mutableCountries);
            });

            connection.on('ReceiveDeleteMessage', id => {
              console.log(`Delete id: ${id}`);
              let mutableCountries = [...latestCountries.current];
              mutableCountries = mutableCountries.filter(c => c.id !== id);

              setCountries(mutableCountries);
            });

            connection.on('ReceivePatchMessage', country => {
              console.log(`Patch: ${country.name}`);
              let mutableCountries = [...latestCountries.current];
              const idx = mutableCountries.findIndex(c => c.id === country.id);
              mutableCountries[idx] = country;

              setCountries(mutableCountries);
            });
          })
          .catch(e => console.log('Connection failed: ', e));
    }
    // useEffect is dependent on changes connection
  }, [connection]);

  const handleAdd = async (name) => {
    try {
      await axios.post(apiEndpoint, {
        name: name
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
    } catch (ex) {
      if (ex.response && (ex.response.status === 401 || ex.response.status === 403)) {
        alert("You are not authorized to complete this request");
      } else if (ex.response) {
        console.log(ex.response);
      } else {
        console.log("Request failed");
      }
    }
  }
  const handleDelete = async (countryId) => {
    const originalCountries = countries;
    setCountries(countries.filter(c => c.id !== countryId));
    try {
      await axios.delete(`${apiEndpoint}/${countryId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
    } catch (ex) {
      if (ex.response && ex.response.status === 404) {
        // country already deleted
        console.log("The record does not exist - it may have already been deleted");
      } else {
        setCountries(originalCountries);
        if (ex.response && (ex.response.status === 401 || ex.response.status === 403)) {
          alert("You are not authorized to complete this request");
        } else if (ex.response) {
          console.log(ex.response);
        } else {
          console.log("Request failed");
        }
      }
    }
  }
  const handleIncrement = (countryId, medalName) => handleUpdate(countryId, medalName, 1);
  const handleDecrement = (countryId, medalName) =>  handleUpdate(countryId, medalName, -1)
  const handleUpdate = async (countryId, medalName, factor) => {
    const idx = countries.findIndex(c => c.id === countryId);
    const mutableCountries = [...countries ];
    mutableCountries[idx][medalName] += (1 * factor);
    setCountries(mutableCountries);
    const jsonPatch = [{ op: "replace", path: medalName, value: mutableCountries[idx][medalName] }];
    console.log(`json patch for id: ${countryId}: ${JSON.stringify(jsonPatch)}`);

    try {
      await axios.patch(`${apiEndpoint}/${countryId}`, jsonPatch, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
    } catch (ex) {
      if (ex.response && ex.response.status === 404) {
        // country does not exist
        console.log("The record does not exist - it may have been deleted");
      } else if (ex.response && (ex.response.status === 401 || ex.response.status === 403)) {
        // in order to restore the defualt medal counts, we would need to save
        // the page value and saved value for each medal (like in the advanced example)
        alert('You are not authorized to complete this request');
        // to simplify, I am reloading the page instead
        window.location.reload(false);
      } else if (ex.response) {
        console.log(ex.response);
      } else {
        console.log("Request failed");
      }
    }
  }
  const handleLogin = async (username, password) => {
    try {
      const resp = await axios.post(usersEndpoint, { username: username, password: password });
      const encodedJwt = resp.data.token;
      localStorage.setItem('token', encodedJwt);
      setUser(getUser(encodedJwt));
    } catch (ex) {
      if (ex.response && (ex.response.status === 401 || ex.response.status === 400 )) {
        alert("Login failed");
      } else if (ex.response) {
        console.log(ex.response);
      } else {
        console.log("Request failed");
      }
    }
  }
  const handleLogout = (e) => {
    e.preventDefault();
    console.log('logout');
    localStorage.removeItem('token');
    setUser({
      name: null,
      canPost: false,
      canPatch: false,
      canDelete: false
    });
    return false;
  }
  const getUser = (encodedJwt) => {
    // return unencoded user / permissions
    const decodedJwt = jwtDecode(encodedJwt);
    return {
      name: decodedJwt['username'],
      canPost: decodedJwt['roles'].indexOf('medals-post') !== -1,
      canPatch: decodedJwt['roles'].indexOf('medals-patch') !== -1,
      canDelete: decodedJwt['roles'].indexOf('medals-delete') !== -1,
    };
  }
  const getAllMedalsTotal = () => {
    let sum = 0;
    medals.current.forEach(medal => { sum += countries.reduce((a, b) => a + b[medal.name], 0); });
    return sum;
  }
  return (
      <Router>
        <div className='appHeading'>
          Olympic Medals
          <span className='badge'>
          { getAllMedalsTotal() }
        </span>
          {user.name ?
              <span className='logout'><a href="/" onClick={handleLogout} className='logoutLink'>Logout</a> [{user.name}]</span>
              :
              <Link to="/login" className='loginLink'>Login</Link>
          }        </div>
        <Route exact path="/login">
          <Login onLogin={handleLogin} />
        </Route>
        <div className='countries'>
          { countries.map(country =>
              <Country
                  key={ country.id }
                  country={ country }
                  medals={ medals.current }
                  canDelete={ user.canDelete }
                  canPatch={ user.canPatch }
                  onDelete={ handleDelete }
                  onIncrement={ handleIncrement }
                  onDecrement={ handleDecrement } />
          )}
        </div>
        { user.canPost && <NewCountry onAdd={ handleAdd } /> }
      </Router>
  );
}

export default App;