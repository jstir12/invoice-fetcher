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
    charges: Array<{totalAmount: number, description: string}>;
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
                totalAmount: parseFloat(project.transaction_Total_Amount),
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

        const dataToWrite = 'Invoice Number,Company Name,Total Amount,Description\n' + 
            Array.from(invoices.entries()).flatMap(([invoiceNumber, invoice]) => 
                invoice.charges.map(charge => `${invoiceNumber},${invoice.company_Name},${charge.totalAmount},${charge.description}`)
            ).join('\n');

        fs.writeFileSync('invoices.csv', dataToWrite);
    }
    catch (err: unknown) {
        if (err instanceof Error){
            console.error('Get Report error:', err.message);
        }
        throw err;
    }
}

main();