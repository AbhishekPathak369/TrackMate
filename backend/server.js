const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// const PORT = 3000;
const PORT = process.env.PORT || 3000;

// POST /getAttendance
app.post('/getAttendance', async (req, res) => {
    const { admission_no, password } = req.body;

    console.log('--- Request Received ---');
    console.log('Admission No:', admission_no);

    if (!admission_no || !password) {
        console.log('Missing credentials');
        return res.status(400).json({ error: 'Admission number and password required' });
    }

    try {
        // Step 1: Authenticate
        console.log('Authenticating...');
        const authResponse = await fetch(
            'https://simplifii-simplified-production.up.railway.app/authenticate',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: admission_no, // fixed field name
                    password: password
                })
            }
        );

        console.log('Authentication HTTP Status:', authResponse.status);

        const authData = await authResponse.json();
        console.log('Authentication Response JSON:', JSON.stringify(authData, null, 2));

        if (!authData.token) {
            console.log('No token received. Invalid credentials?');
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = authData.token;

        // Step 2: Fetch attendance
        console.log('Fetching attendance with token...');
        const attendanceResponse = await fetch(
            'https://abes.platform.simplifii.com/api/v1/custom/getCFMappedWithStudentID?embed_attendance_summary=1',
            {
                headers: { 'Authorization': 'Bearer ' + token }
            }
        );

        console.log('Attendance HTTP Status:', attendanceResponse.status);

        const attendanceData = await attendanceResponse.json();
        console.log('Attendance Response JSON:', JSON.stringify(attendanceData, null, 2));

        if (!attendanceData.response || !attendanceData.response.data || attendanceData.response.data.length === 0) {
            console.log('Attendance data is empty!');
            return res.json({ message: 'No attendance data found.', data: attendanceData });
        }

        console.log('Attendance data found. Sending to frontend.');
        res.json(attendanceData);

    } catch (err) {
        console.error('Error occurred:', err);
        res.status(500).json({ error: 'Failed to fetch attendance' });
    }
});

app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});
