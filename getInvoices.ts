import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const BASE_URL = 'https://app22.workamajig.com/api/beta1/';
const HEADERS: HeadersInit = {
    APIAccessToken: process.env.API_ACCESS_TOKEN || '',
    UserToken: process.env.USER_TOKEN || '',
};

interface Project {
    transaction_Total_Amount: string;
    line_Description: string;
    invoice_Number: string;
    project_Name: string;
    project_Number: string;
}

interface Invoice {
    company_Name: string;
    charges: Array<{total_Amount: number, description: string}>;
}

interface Data {
    data?: {
        report?: Project[];
    };
}

const getProjects = async (): Promise<Map<string, Invoice>> => {
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
        
        // Check if the data is in the expected format
        if (!data.data || !Array.isArray(data.data.report)) {
            throw new Error('Report data is missing or not in the expected format');
        }
        const invoices = new Map<string, Invoice>();

        for(const project of data.data.report){
            const invoice = invoices.get(project.invoice_Number) || {
                company_Name: '',
                charges: []
            };

            invoice.charges.push({
                total_Amount: parseFloat(project.transaction_Total_Amount),
                description: project.line_Description
            });
            if (invoice.company_Name === '') {
                invoice.company_Name = project.project_Name;
            }
            invoices.set(project.invoice_Number, invoice);
        }

        return invoices;
    }
    catch(err: unknown){
        if (err instanceof Error){
            console.error('Get Report error:', err.message);
        }
        throw err;
    }
}

const main = async (): Promise<void> => {
    try {
        const invoices = await getProjects();
        
        for (const [invoiceNumber, invoice] of invoices) {
            let output: string = '';
            output += 'T\n'; // This is to signify test data

            for (const charge of invoice.charges){
                const companyNameParts: string[] = invoice.company_Name.split('#');
                const companyNumber: string = companyNameParts[1].split(' ')[0];
                output += `${companyNumber}\n`;

                output += `${charge.total_Amount}\n`;
                const description: string = charge.description;

                if ((description + '-' + invoiceNumber).length > 85){
                    output += `${description.substring(0, 35)}^\n`;
                    output += `${description.substring(35, 85)}^\n`;
                    output += `${description.substring(85)}-${invoiceNumber}\n`;
                }
                else if ((description + '-' + invoiceNumber).length > 35){
                    output += `${description.substring(0, 35)}^\n`;
                    output += `${description.substring(35)}-${invoiceNumber}\n`;
                }
                else{
                    output += `${description}\n`;
                }
                output += '1\n'; // This is for quantity
            }
            output += '-1\n'; // This is for the end of the file
            const companyParts: string[] = invoice.company_Name.split('#');

            const path = require('path');
            
            const fileName = companyParts[1].split('.')[0].replace(/\s/g, '');
            fs.mkdirSync(path.join(__dirname, 'data-files'), { recursive: true });
            fs.writeFileSync(path.join(__dirname, 'data-files', `${fileName}.txt`), output);
        }
        
    }
    catch(err: unknown){
        if(err instanceof Error){
            console.error('Main error:', err.message);
        }
    }
        
}

main();