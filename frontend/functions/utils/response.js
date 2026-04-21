export const json = (data, status = 200) => { 
  return new Response(JSON.stringify(data), { 
    status, 
    headers: { 'Content-Type': 'application/json' } 
  }); 
}; 

export const error = (message, status = 500) => { 
  return json({ error: message }, status); 
};
