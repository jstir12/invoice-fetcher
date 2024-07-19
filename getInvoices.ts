import dotenv from 'dotenv';
//import fetch, { HeadersInit } from 'node-fetch';

dotenv.config();

const BASE_URL = 'https://app22.workamajig.com/api/beta1/';
const HEADERS: HeadersInit = {
    APIAccessToken: process.env.API_ACCESS_TOKEN || '',
    UserToken: process.env.USER_TOKEN || '',
};

interface Project {
    project_Name: string;
}

interface Data {
    data?: {
        report?: Project[];
    };
}

const getProjects = async (): Promise<string[]> => {
    const url = `${BASE_URL}reports?reportKey=${process.env.REPORT_KEY}`;
    const config = {
        headers: HEADERS
    };

    try{
        const response = await fetch(url, {
            method: 'GET',
            headers: config.headers
        });

        if(!response.ok){
            throw new Error(`Failed to get report: ${response.status}`);
        }

        const data: Data = await response.json();
        console.log('Data:', data);
        
        // Check if the data is in the expected format
        if (!data.data || !Array.isArray(data.data.report)) {
            throw new Error('Report data is missing or not in the expected format');
        }

        // Get the project names from the report
        const report = data.data.report;
        console.log('Report:', report);

        const projectNames = report.map(project => project.project_Name);
        return projectNames;
    }
    catch(err: any){
        console.error('Get Report error:', err.message);
        throw err;
    }
}

const getInvoices = async (projectKey: string): Promise<void> => {
    // Implement your logic here
}

const main = async (): Promise<void> => {
    try {
        const projectNames = await getProjects();
        console.log('Project Names:', projectNames);
    }
    catch (err: any) {
        console.error('Error:', err.message);
    }
}

main();