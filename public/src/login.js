import axios from 'axios';
import { showAlert } from './alerts';

//Es6 import export syntax
export const login = async (email, password) => {

  console.log(email, password);
  try {

    const res = await axios({
      method: 'POST',
      url: 'http://127.0.0.1:3000/api/v1/users/login',
      data: {
        email,
        password,
      },
    });
    //console.log(res.data);
    if (res.data.status === 'success') {
      showAlert('success', 'Logged in successfully!');

      window.setTimeout(() => {
        location.assign('/');
      }, 1500);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};

export const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: 'http://127.0.0.1:3000/api/v1/users/logout',
    });

    if (res.data.status === 'success') {
      location.reload(true); //to not get the page from the cashe, get the page from the server.
    }
  } catch (err) {
    showAlert('error', 'ERROR Logging out. try again!');
  }
};
