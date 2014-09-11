require 'CSV'
require 'json'
require 'net/http'
require 'uri'

# Read the CSV file
csv = CSV.read("inpatient_data_2012_nc.csv")

# Take out the headers, since they don't contain anything to be geocoded
headers = csv[0]
csv = csv.drop(1)

geocoding_url = "https://maps.googleapis.com/maps/api/geocode/json?address="

STREET_ADDRESS = 3
CITY = 4
STATE = 5
ZIP = 6
API_KEY = "<insert your API key here>"

# How many to iterate until
stop = 2450

headers.push("Provider Latitude")
headers.push("Provider Longitude")

# Uncomment if using reverse_each, since it doesn't provide an index
#index = 0

# Google Geocode limits API calls to 2500 a day, so we run the script twice over
# the CSV file. Once with each_with_index to go forward until we hit the stop point
# then reverse_each with a separate index variable, again until we hit the stop point.
# csv.reverse_each do |row|
csv.each_with_index do |row, index|
  street = row[STREET_ADDRESS]
  city = row[CITY]
  state = row[STATE]
  zip = row[ZIP]
  
  full_address = "#{street}, #{city}, #{state} #{zip}".gsub(" ", "+")
  
  uri = URI.parse(geocoding_url + full_address + "&key=#{API_KEY}")

  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = true
  response = http.request(Net::HTTP::Get.new(uri.request_uri))
  
  data = response.body

  begin
    data = JSON.parse(data)
    
    status = data["status"]
    
    if status == "OK"
      results = data["results"][0]
      
      geometry = results["geometry"]
      location = geometry["location"]
      lat = location["lat"]
      long = location["lng"]
      
      row.push(lat)
      row.push(long)
    else
      raise "API error: #{status}"
    end
    
    

  rescue => e
    puts "There was an error retrieving the geocode for #{full_address}."
    puts "Exception: #{e.message} "
  ensure
    
  end
  
  # Google Geocoding API limited to 10 requests per second
  if index % 10 == 0
    sleep(1)
  end
  puts "#{index} done."
  
  break if index == stop
  
  # Uncomment if using reverse_each, since it doesn't provide an index
  #index += 1
end

# Write out the data, starting with the headers
CSV.open('inpatient_data_2012_nc_lat_long.csv', 'wb') do |csv_writer|
  csv_writer << headers
  
  csv.each do |row|
    csv_writer << row
  end
  
end