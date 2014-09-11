Visual Analytics Project

Steps to set up map:
If you don't want to follow the instructions in using "brew" to install on your machine, then try to find a binary at: http://trac.osgeo.org/gdal/wiki/DownloadingGdalBinaries

The examples below are for Mac OS X. Install GDAL complete from http://www.kyngchaos.com/software:frameworks (the same link from the GDAL binaries page above). 

This just installs the frameworks, but puts nothing in your environment variables, so put those in manually by adding the following line to ~/.bash_profile:
export PATH=/Library/Frameworks/GDAL.framework/Programs:$PATH

Next, run the command . ~/.bash_profile to start using the profile immediately without having to log out and log back in. 

The remaining parts follow the tutorial at http://bost.ocks.org/mike/map/. In place of some of its commands to extract UK data, we substitute "USA":
ogr2ogr -f GeoJSON -where "ADM0_A3 IN ('USA')" subunits.json ne_10m_admin_0_map_subunits.shp

topojson --id-property SU_A3 -p name=NAME -p name -o states.json subunits.json