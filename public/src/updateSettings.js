//updateData
import axios from 'axios';
import { showAlert } from './alerts';

export const updateSettings = async (data, type) => {
  try {
    const res = await axios({
      method: 'PATCH',
      url: `http://127.0.0.1:3000/api/v1/users/${type==='password'?'updateMyPassword':'updateMe'}`,
      data
    });
    if (res.data.status === 'success') {
      showAlert('success', `${type.toUpperCase()} updated Successfully`);
    }

  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};
