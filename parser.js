// ClassApp DevChallenge (Parser Only)
// Available at: https://classapp-dev-challenge.herokuapp.com/
// Challenge: https://gist.github.com/lucas-brito/84a77f08115ae4b9b034c010ff2a2ab4
// Author: Ruy Castilho Barrichelo, github.com/ruycastilho

// Packages Used

// CSV-Parse : .csv file input and initial parsing
var parse = require('csv-parse');
var transform = require('stream-transform');
// Filestream : Working with file I/O
var fs = require("fs");
// Lodash : "Working with arrays, numbers, objects, strings, etc.""
var _ = require('lodash');
// Google-Libphonebumber : Working with phone numbers
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
const PNF = require('google-libphonenumber').PhoneNumberFormat;
// Validator : Email validation
var validator = require('validator');

// Data Structures
// Constructors

// User
function User(fullname, eid, classes, addresses, invisible, see_all) {
    this.fullname = fullname;
    this.eid = eid;
    this.classes = classes;
    this.addresses= addresses;  // Array of Address
    this.invisible = invisible;
    this.see_all = see_all;
}

// Address
function Address(type, tags, address) {
    this.type = type;           // Phone or Email
    this.tags = tags;
    this.address = address;
}

// Column (Stores header data, separates it into type(title) and tags)
function Column(type, tags) {
    this.type = type;
    this.tags = tags;

}

// Arrays to store main input and output data
var output = [];                // Array of User objects, to be transformed to JSON format
var header = [];               // Array of Column objects that stores .csv header data

// .csv Input and Initial parsing
fs.readFile('input.csv', function (err, fileData) {
    
    // Reads data from 'input.csv' and stores it in the array named 'rows'
    parse(fileData, function(err, rows) {

        // Separates first row as a header and separates each column as an element of an array
        var headerList = _.chunk(_.head(rows), 1);

        // Drops header from 'rows' so that it only contais user information
        var data_rows = _.drop(rows);

        // Auxiliar variables for parsing header
        var tokenized;
        var tags = [];
        var type;   

        // Header Parsing
        for(i=0; i < headerList.length ; i++) {

            tags.splice(0, tags.length);                                        // Clearing array
            tokenized = headerList[i].toString().replace(/,/g, '').split(" ");  // Tokenizes entry
            type = _.head(tokenized);                                           // Selects first token as header type(title)
            tags = _.drop(tokenized);                                           // Remaining tokens are tags


            // Stores new header element in an array 
            header.push(new Column(type, tags.slice()));
        }

        // User information parsing

        // Auxiliar variables for parsing
        var user_index,
            name,
            id,
            classes = [],
            addresses = [],
            invisible_input,
            invisible,
            see_all_input,
            see_all,
            data_list,
            tokenized_classes = [],
            tokenized_emails = [],
            phone_number,
            parsed_number;

        // Runs through each row of user data from input file
        for(i=0; i < data_rows.length ; i++) {

            // Separates each column entry from a row
            data_list = _.chunk(data_rows[i], 1);

            // Clearing arrays
            classes.splice(0, classes.length);
            addresses.splice(0, addresses.length);
            tokenized_classes.splice(0, tokenized_classes.length);
            tokenized_emails.splice(0, tokenized_emails.length);

            // Runs through each row entrt
            for(j=0; j < data_rows[i].length ; j++) {

                // Switch to determine actions to be performed depending on the type of entry (based on the 'header' array)
                switch ( header[j].type ) {
                
                    // If entry corresponds to a name, just stores it
                    case 'fullname':
                        name = data_list[j].toString();
                        break;

                    // If entry corresponds to an eid, just stores it
                    case 'eid':
                        id = data_list[j].toString();
                        break;

                    // If entry corresponds to 'invisible':
                    case 'invisible':
                        invisible_input = data_list[j].toString();

                        // Considers empty entry, "0" and "no" as a 'false' value
                        if (invisible_input == "" || invisible_input == "0" || invisible_input == "no") {
                            invisible = false;
                        }
                        else {
                            invisible = true;

                        }
                        break;

                    // If entry corresponds to 'see_all':
                    case 'see_all':
                        see_all_input = data_list[j].toString();

                        // Considers empty entry, "0" and "no" as a 'false' value
                        if (see_all_input == "" || see_all_input == "0" || see_all_input == "no") {
                            see_all = false;
                        }
                        else {
                            see_all = true;

                        }
                        break;
                    
                    // If entry corresponds to 'class':
                    case 'class':

                        // Replaces '/' with ',' to obtain a consistent pattern, and tokenizes string with commas as delimiters
                        tokenized_classes = _.chunk(data_list[j].toString().replace('/', ',').split(","), 1);

                        // Adds new value to an array, if not empty
                        for(k=0; k < tokenized_classes.length; k++) {
                            if (tokenized_classes[k].toString() != "") {
                                classes.push(tokenized_classes[k].toString().trim());

                            }

                        }                 
 
                        break;

                    // If entry corresponds to 'phone':
                    case 'phone':
                        // Initial trimming
                        phone_number = data_list[j].toString().trim();
                        
                        // Attempts to parse input as a phone number, if it fails (error thrown, just skips entry)
                        try {
                            parsed_number = phoneUtil.parse(phone_number, 'BR');

                        }
                        catch (phone_err) {
                            break;
                        }

                        // If parsing is successfull and the parsed number is valid:
                        if ( phoneUtil.isValidNumber(parsed_number) ) {

                            // Searches for a previous phone number input with same number
                            // If it is found, just adds new tags, if not, adds new Address object to an array
                            var index = addresses.findIndex( function (addr) {
                                return addr.address == phone_number && addr.type == 'phone'
                            });
                            if (index != -1) {
                                addresses[index].tags.push.apply(addresses[index].tags, header[j].tags.slice());
                            }
                            else {
                                addresses.push(new Address(header[j].type, header[j].tags.slice(), phoneUtil.format(parsed_number, PNF.E164).replace("+", "")));
                            }

                        }
                        break;

                    // If entry corresponds to 'email':
                    case 'email':
                        // Replaces '/' with ',' to obtain a consistent pattern, and tokenizes string with commas as delimiters
                        tokenized_emails = _.chunk(data_list[j].toString().replace('/', ',').split(","), 1);
                        // Trims every element
                        tokenized_emails.map(function(tok_email) { return tok_email.toString().trim() });
           
                        // Checks which email inputs are valid
                        for(k=0; k < tokenized_emails.length; k++) {
                            if (validator.isEmail(tokenized_emails[k].toString()) ) {
             
                                // If valid:
                                // Searches for a previous email input with same address
                                // If it is found, just adds new tags, if not, adds new Address object to an array
                                var index = addresses.findIndex( function (addr) {
                                    return addr.address == tokenized_emails[k] && addr.type == 'email'
                                });

                                if (index != -1) {
                                    addresses[index].tags.push.apply(addresses[index].tags, header[j].tags.slice());

                                }
                                else {
                                    addresses.push(new Address(header[j].type, header[j].tags.slice(), tokenized_emails[k].toString()));
        
                                }
                            }
                        }
                        break;
                }

            }

            // After all parsing is done:
            // Searches for previous user data/row input with same 'eid'
            user_index = output.findIndex( function (user) {
                return user.eid == id;
            });

            // If it is found, update addresses, classes and boolean variables
            if (user_index != -1) {
                // Extending arrays
                output[user_index].addresses.push.apply(output[user_index].addresses, addresses.slice());
                output[user_index].classes.push.apply(output[user_index].classes, classes.slice());

                // Boolean operations (default is 'false', so if new value is 'true', it will be updated (logic OR))
                output[user_index].invisible = output[user_index].invisible || invisible;
                output[user_index].see_all = output[user_index].see_all ||see_all;
            }
            // If not, pushes new User object
            else {
                output.push(new User(name, id, classes.slice(), addresses.slice(), invisible, see_all));
            }
     
        }

        // Finally, transforms array into a JSON and outputs it
        var outputJSON = JSON.stringify(output, null, 2);
        // console.log(outputJSON);
        fs.writeFile('output.json', outputJSON, 'utf8', function(err){
            if(err) {
               console.log("Error ocurred during file creation/output.");
            }
        });
    });

})
