require('dotenv').config();

const BASE_URL = 'https://app22.workamajig.com/api/beta1/';
const HEADERS = {
    APIAccessToken: process.env.API_ACCESS_TOKEN,
    UserToken: process.env.USER_TOKEN,
};

const getProjects = async () => {
    const url = `${BASE_URL}projects?searchField=projectnumber&searchFor=DOIT`;
    const config = {
        headers: HEADERS
    };

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: config.headers
        });

        if (!response.ok) {
            throw new Error(`Failed to get projects: ${response.status}`);
        }

        const data = await response.json();

        if (!data || !data.data || !data.data.project) {
            throw new Error('Unexpected response data structure');
        }

        const hostingProjects = data.data.project.filter(project => project.ProjectName.startsWith('Hosting'));
        const projectKeys = hostingProjects.map(project => project.ProjectKey);

        return projectKeys;
    } catch (err) {
        console.error('Get Projects error:', err.message);
        throw err;
    }
}

const getInvoices = async (projectKey) =>{

}

const main = async () => {
    try {
        const projectKeys = await getProjects();
        console.log('Project Keys:', projectKeys);
    }
    catch (err) {
        console.error('Error:', err.message);
    }
}
main();