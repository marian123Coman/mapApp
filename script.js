'use strict';

let map;
let mapEvent;
// clasa workout e parintele la running si cycling
class Workout {
  date = new Date();
  //creem id uri cu ajutorul la date,dupa care le convertim in array cu+
  //si luam ulttimele 10 numere din acel string nou creat
  id = (Date.now() + '').slice(-10);
  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance; //in km
    this.duration = duration; //in minutes
  }
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
     'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;

    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    //minutes pe km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;

    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// aplication architecture

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  constructor() {
    //   putem executa imediat functii in constructor
    this._getPosition();

    // get data from local storage
    this._getLocalStorage();

    // cand avem event listener intr o clasa ,trebuie folosit mereu bind(this)
    form.addEventListener('submit', this._newWorkout.bind(this));
    // adaugam marker pe harta dupa ce alegem tipul de activitate care o facem
    inputType.addEventListener('change', this._toggleElevationField.bind(this));
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      // trebuie sa bind(this,pentru ca altfel in loadMap va fi undefined)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not find your position');
        }
      );
  }

  _loadMap(position) {
    let latitude = position.coords.latitude;
    let longitude = position.coords.longitude;

    let coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(workout => {
        // this._renderWorkout(workout);
        this._renderWorkoutMarker(workout);
      });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    //   empty the inputs

    inputDistance.value = '';
    inputDuration.value = '';
    inputCadence.value = '';
    inputElevation.value = '';
    // hide the form
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    let validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    let allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();
    // get data from form
    let type = inputType.value;
    let distance = +inputDistance.value;
    let duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    // if activity is running create running object
    if (type === 'running') {
      let cadence = +inputCadence.value;
      // check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        return alert('Inputs have to be positive numbers');
      }
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // if activity is cycling create cycling object
    if (type === 'cycling') {
      let elevation = +inputElevation.value;
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      ) {
        return alert('Inputs have to be positive numbers');
      }
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    // add new object to workout array
    this.#workouts.push(workout);

    // render workout on map as a marker
    this._renderWorkoutMarker(workout);
    // render new workout on list
    this._renderWorkout(workout);
    // hide the form and clera input fields
    this._hideForm();
    //   clear input fields
    inputDistance.value = '';
    inputDuration.value = '';
    inputCadence.value = '';
    inputElevation.value = '';

    // set local storage to all workouts
    this._setLocalStorage();
  }
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>`;

    if (workout.type === 'running')
      html += `<div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>`;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>`;

    form.insertAdjacentHTML('afterend', html);
  }
  _moveToPopup(e) {
    let workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;
    let workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);
    // set view e din leaflet ,metoda
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }
  // local storage api
  // use only to store small aount of data
  _setLocalStorage() {
    //   cu json.stringify transformam obiectul in string
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    //   cu json.parse,transformam stringul iarasi in obiecte(array de obiecte)
    let data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(workout => {
      this._renderWorkout(workout);
    //   this._renderWorkoutMarker();
    });
  }
//   reset from console
  reset(){
      localStorage.removeItem('workouts')
      location.reload()
  }
}

let app = new App();

/////////////////////////////////////////////////////////////////
// let map;
// let mapEvent;

// // Geolocation API
// navigator.geolocation.getCurrentPosition(
//   function (position) {
//     let latitude = position.coords.latitude;
//     let longitude = position.coords.longitude;
//     console.log(latitude, longitude);
//     console.log(`https://www.google.de/maps/@${latitude},${longitude},14z`);
//     // id map e din html,iar in acel element cu id de map,harta va fi displayed
//     // L e functie din leaflet

//     let coords = [latitude, longitude];
//     // leaflet functions
//     let map = L.map('map').setView(coords, 13);
//     L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
//       attribution:
//         '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
//     }).addTo(map);

//     // map e un obiect din libraria leaflet
//     // map.on e ca si cum zicem map.addEventListener,dar in leaflet se numeste on
//     // mapEvent e ca  event din js in addEvent LIstener
//     map.on('click', function (mapE) {
//       mapEvent = mapE;
//       form.classList.remove('hidden');
//       inputDistance.focus();
//     });
//   },
//   function () {
//     alert('we could not find your position');
//   }
// );

// // event listener pentru form input

// form.addEventListener('submit', function (event) {
//   event.preventDefault();

// // clear input value after submit
// inputDistance.value = ''
// inputDuration.value = ''
// inputCadence.value = ''
// inputElevation.value = ''

//   // display marker
//   //   mapEvent are aceste 2 variabile in latlng//console.log(mapEvent)
//   let lat = mapEvent.latlng.lat;
//   let lng = mapEvent.latlng.lng;

//   L.marker([lat, lng])
//     .addTo(map)
//     .bindPopup(
//       L.popup({
//         // proprietati din documentatia leaflet,diferite stiluri
//         maxwidth: 250,
//         minwidth: 100,
//         // sa nu dispara cand dm click
//         autoClose: false,

//         closeOnClick: false,
//         // stiluri de la css file propriu
//         className: 'running-popup',
//       })
//     )
//     // metoda care contine textul din popup
//     .setPopupContent('Working Out')
//     .openPopup();
// });

// inputType.addEventListener('change',function(){
//     inputElevation.closest('.form__row').classList.toggle('.form__row--hidden')
//     inputCadence.closest('.form__row').classList.toggle('.form__row--hidden')
// })
