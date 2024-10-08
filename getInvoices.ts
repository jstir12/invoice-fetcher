import dotenv from 'dotenv';
import fs from 'fs';
import {Client} from 'pg';

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

const client = new Client({
    host: 'sam.doitbest.com',
    user: 'www',
    password: '',
    database: 'hwi',
    port: 5432
});

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

const getMemberNumber = (companyName: string): string => {
    const companyNameParts: string[] = companyName.split('#');
    return companyNameParts[1].split(' ')[0];
};

const checkMemberNumber = async (memberNumber: string): Promise<boolean> => {
    try{
        const query = 'SELECT * FROM members WHERE id = $1';
        const result = await client.query(query, [memberNumber]);
        return result.rows.length > 0;
    }
    catch(err: unknown){
        if(err instanceof Error){
            console.error('Check Member Number error:', err.message);
        }
        throw err;
    }
};

const main = async (): Promise<void> => {
    try {
        const invoices = await getProjects();

        const path = require('path');
        const dataFilesDir = path.join(__dirname, 'data-files');

        //Check if file named 'existing_invoice_files' exists
        const existing_invoice_files = path.join(__dirname, 'existing_invoice_files.txt');
        
        // Delete all files in the 'data-files' directory
        if (fs.existsSync(dataFilesDir)) {
            const files = fs.readdirSync(dataFilesDir);

            for (const file of files) {
                fs.unlinkSync(path.join(dataFilesDir, file));
            }
        }

        // Read the existing_invoice_files file 
        let existingFiles: string[] = [];
        if (fs.existsSync(existing_invoice_files)){
            existingFiles = fs.readFileSync(existing_invoice_files, 'utf8').split('\n');
        }

        try{
            await client.connect();

            for (const [invoiceNumber, invoice] of invoices) {
                const companyNumber: string = getMemberNumber(invoice.company_Name);
                const memberExists: boolean = await checkMemberNumber(companyNumber);
                if (!memberExists){
                    console.error(`Member ${companyNumber} does not exist. Invoice ${invoiceNumber} will not be processed.`);
                    continue;
                }

                if (existingFiles.includes(invoiceNumber)) {
                    continue;
                }
                else{
                    fs.appendFileSync(existing_invoice_files, `${invoiceNumber}\n`);
                    existingFiles.push(invoiceNumber);
                }
                let output: string = '';
                output += 'P\n'; // This is to signify production data
                
                for (const charge of invoice.charges){

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
                    output += '-1\n'; // This is for the end of the file
                    output += 'Y\n' // This is to signify that the invoice is correct
                        
                    const fileName: string = getMemberNumber(invoice.company_Name);

                    // Now write files to the 'data-files' directory
                    fs.writeFileSync(path.join(dataFilesDir, `${fileName}.txt`), output);
                }
            }
        }
        catch(err: unknown){
            if(err instanceof Error){
                console.error('Main error:', err.message);
            }
        }
        finally{
            await client.end();
        }
        
    }
    catch(err: unknown){
        if(err instanceof Error){
            console.error('Main error:', err.message);
        }
    }
}

main();