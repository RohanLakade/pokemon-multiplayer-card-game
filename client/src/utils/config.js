// import.meta.env is how Vite gives the browser the VITE_ variables from the .env file.
export const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3000';
