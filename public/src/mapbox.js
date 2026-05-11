export const displayMap = (locations) => {
  mapboxgl.accessToken =
    process.env.MAPBOX_TOKEN ;
  const map = new mapboxgl.Map({
    container: 'map', // container ID
    style: 'mapbox://styles/youssef1234/cmm4su4ku000e01qz3m9ihsq5', // style URL
    scrollZoom: false, //so map doesn't zoom when scroll on it.
    // center: [-118.333392,34.111122], // starting position [lng, lat]
    // zoom: 10, // starting zoom
    // interactive: false
  });

  // Putting some markers on the map.

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((loc) => {
    //Add marker class to div (it is already built in CSS).
    const el = document.createElement('div');
    el.className = 'marker';

    //Add marker to the map
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom', //to put the bottom of the image(class marker) on the map.
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    //Add popup to the map
    new mapboxgl.Popup({
      offset: 30,
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    // Extend map bounds to include current location.
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 150,
      bottom: 150,
      right: 100,
      left: 100,
    },
  });
};
