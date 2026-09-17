const PREFIX='hr-core-v2';
export const storage={get(key,fallback){try{const v=localStorage.getItem(`${PREFIX}-${key}`);return v?JSON.parse(v):fallback}catch{return fallback}},set(key,value){try{localStorage.setItem(`${PREFIX}-${key}`,JSON.stringify(value));return true}catch{return false}},remove(key){localStorage.removeItem(`${PREFIX}-${key}`)}};
