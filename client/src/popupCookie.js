// Session cookie (no expiry): cleared when the browser closes, and on login/logout
const NAME = 'co_popups_off';

export const popupsOff = () => document.cookie.split('; ').includes(`${NAME}=1`);
export const turnPopupsOff = () => {
  document.cookie = `${NAME}=1; path=/; SameSite=Lax`;
};
export const clearPopupsOff = () => {
  document.cookie = `${NAME}=; path=/; max-age=0; SameSite=Lax`;
};
