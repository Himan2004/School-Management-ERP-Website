import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  theme: 'light',
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.theme = 'light';
      localStorage.setItem('adminDarkMode', 'false');
    },
    toggleDarkMode: (state) => {
      state.theme = 'light';
      localStorage.setItem('adminDarkMode', 'false');
    },
    setTheme: (state) => {
      state.theme = 'light';
      localStorage.setItem('adminDarkMode', 'false');
    },
  },
});

export const { toggleTheme, toggleDarkMode, setTheme } = themeSlice.actions;
export const selectTheme = (state) => 'light';
export const selectIsDarkMode = (state) => false;

export default themeSlice.reducer;
