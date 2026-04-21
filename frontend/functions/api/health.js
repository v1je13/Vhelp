import { json } from '../utils/response'; 

export async function onRequest(context) { 
  return json({ status: 'ok' }); 
}
