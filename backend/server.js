const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const PORT = process.env.PORT || 3000; // Dynamic port for Railway or local

// ✅ Your live Railway link
const BASE_URL = 'https://trackmate-production-888b.up.railway.app';

// Landing route
app.get('/', (req, res) => {
  res.send(`✅ TrackMate Attendance API is running! Base URL: ${BASE_URL}`);
});

// POST /getAttendance
app.post('/getAttendance', async (req, res) => {
  const { admission_no, password } = req.body;

  console.log('--- Request Received ---');
  console.log('Admission No:', admission_no);

  if (!admission_no || !password) {
    return res.status(400).json({ error: 'Admission number and password required' });
  }

  try {
    // Step 1: Authenticate
    const authResponse = await fetch(
      'https://simplifii-simplified-production.up.railway.app/authenticate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: admission_no, password })
      }
    );

    const authData = await authResponse.json();

    if (!authData.token) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = authData.token;

    // Step 2: Fetch attendance
    const attendanceResponse = await fetch(
      'https://abes.platform.simplifii.com/api/v1/custom/getCFMappedWithStudentID?embed_attendance_summary=1',
      {
        headers: { Authorization: 'Bearer ' + token }
      }
    );

    const attendanceData = await attendanceResponse.json();

    if (!attendanceData.response || !attendanceData.response.data || attendanceData.response.data.length === 0) {
      return res.json({ message: 'No attendance data found.', data: attendanceData });
    }

    res.json(attendanceData);

  } catch (err) {
    console.error('Error occurred:', err);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
  console.log(`🌍 Railway URL: ${BASE_URL}`);
});
