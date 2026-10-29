import axios from 'axios'


export const sapApi = axios.create({
  baseURL: process.env.SAP_API_URL ?? 'http://localhost:8000',
  timeout: 10000,
  headers: {
    'X-Service-Token': process.env.SAP_SERVICE_TOKEN!,
  },
})