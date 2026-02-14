import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function numberToWords(amount: number): string {
    const words = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount).replace(/₹/g, '').trim()

    // Simple implementation for "Amount in Words"
    // For a real production app, we might want a full converter lib, 
    // but this is a decent placeholder or we can add a small custom function.
    // Let's add a basic custom one for Indian numbering.

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convertGroup = (n: number): string => {
        if (n < 20) return ones[n];
        const digit = n % 10;
        return tens[Math.floor(n / 10)] + (digit ? ' ' + ones[digit] : '');
    }

    if (amount === 0) return 'Zero';

    const numStr = Math.floor(amount).toString();
    const len = numStr.length;
    let parts: string[] = [];

    // Indian numbering system logic can be complex to golf into a few lines without a lib.
    // For now, let's use a simpler approach: 
    // If it's small enough, standard western, but Indian needs Lakh/Crore.
    // Let's stick to a robust simple version or just returning the formatter for now if complex.
    // Actually, let's try a simplified recursive approach.

    const num = Math.floor(amount);
    if (num === 0) return "Zero Rupees Only";

    const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tensArr = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    function convert(n: number): string {
        if (n < 20) return units[n];
        if (n < 100) return tensArr[Math.floor(n / 10)] + (n % 10 ? " " + units[n % 10] : "");
        if (n < 1000) return units[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convert(n % 100) : "");
        if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
        if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + convert(n % 100000) : "");
        return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + convert(n % 10000000) : "");
    }

    return convert(num) + " Rupees Only";
}

