/**
 * aSc Edupage API Configuration
 * 
 * This configuration handles the connection to UPTM's Edupage system
 * for fetching timetable data (teachers, subjects, classes, lessons).
 * 
 * The aSc Timetables API uses a specific endpoint format for external API access.
 * Standard format: https://{subdomain}.edupage.org/timetable/server/export.js?apikey=XXX&cmd=getbasedata
 */

module.exports = {
    // School subdomain (uptm.edupage.org)
    subdomain: 'uptm',
    
    // API Key from environment variable
    apiKey: process.env.EDUPAGE_API_KEY,
    
    // Base URL for Edupage API
    baseUrl: 'https://uptm.edupage.org',
    
    // API endpoint path - From Edupage documentation: /eduapi
    apiPath: '/eduapi',
    
    // Number of days before data is considered stale
    staleDays: 7,
    
    // Available API commands based on API key permissions
    commands: {
        getBaseData: 'getbasedata',      // Fetches teachers, subjects, classes, rooms
        listTimetables: 'listtimetables', // Lists available timetable versions
        getTimetable: 'gettimetable'      // Fetches specific timetable data
    },
    
    // Build API URL with command
    buildUrl: function(command, params = {}) {
        const url = new URL(`${this.baseUrl}${this.apiPath}`);
        url.searchParams.append('apikey', this.apiKey);
        url.searchParams.append('cmd', command);
        
        // Add any additional parameters
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.append(key, value);
        });
        
        return url.toString();
    }
};
