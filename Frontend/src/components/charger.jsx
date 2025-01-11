import React from 'react';
import ReactApexChart from 'react-apexcharts';
import AppBar from './appbar';
import axios from 'axios';
import moment from 'moment-timezone';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerImage from './image.png';

class ChargerDashboard extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      charger1Series: [],
      charger2Series: [],
      options: {
        chart: {
          height: 350,
          type: 'bar',
          background: '#333',
        },
        plotOptions: {
          bar: {
            borderRadius: 10,
            dataLabels: {
              position: 'top',
            },
          },
        },
        dataLabels: {
          enabled: true,
          formatter: (val) => `${val} kWh`,
          offsetY: -20,
          style: {
            fontSize: '12px',
            colors: ['#ffffff'],
          },
        },
        xaxis: {
          categories: [],
          position: 'top',
          axisBorder: {
            show: false,
          },
          axisTicks: {
            show: false,
          },
          labels: {
            style: {
              colors: '#ffffff',
            },
          },
        },
        yaxis: {
          axisBorder: {
            show: false,
          },
          axisTicks: {
            show: false,
          },
          labels: {
            formatter: (val) => `${val} kWh`,
            style: {
              colors: '#ffffff',
            },
          },
        },
        title: {
          text: 'Energy Consumption for Chargers',
          floating: true,
          offsetY: 330,
          align: 'center',
          style: {
            color: '#ffffff',
          },
        },
        tooltip: {
          theme: 'dark',
          style: {
            fontSize: '14px',
            color: '#000000',
          },
        },
      },
      positions: [
        [17.445289, 78.349593],
        [17.445160, 78.349806],
      ],
    };

    this.updateInterval = null;
  }

  componentDidMount() {
    this.fetchData();
    this.updateInterval = setInterval(this.fetchData, 3600000); // Update every 1 hour
  }

  componentWillUnmount() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

  fetchData = async () => {
    try {
      const [charger1Response, charger2Response] = await Promise.all([
        axios.get('http://localhost:8000/charger/get-transactions'),
        axios.get('http://localhost:8000/charger/get-transactions-2'),
      ]);

      const processData = (transactions) => {
        return transactions
          .slice(-10) // Limit to the last 10 records
          .map((item) => ({
            x: moment.unix(item.Timestamp).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'),
            y: item.Units_Consumed || 0,
          }));
      };

      const charger1Data = processData(charger1Response.data.transactions || []);
      const charger2Data = processData(charger2Response.data.transactions || []);

      this.setState({
        charger1Series: [
          { name: 'Charger 1', data: charger1Data },
        ],
        charger2Series: [
          { name: 'Charger 2', data: charger2Data },
        ],
        options: {
          ...this.state.options,
          xaxis: {
            ...this.state.options.xaxis,
            categories: charger1Data.map((item) => item.x),
          },
        },
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  render() {
    return (
      <div style={{ backgroundColor: '#121212', color: '#fff', minHeight: '90vh', padding: '20px', overflow: 'hidden' }}>
        <AppBar />

        <div style={{ height: '40vh', marginTop: '1vw' }}>
          <MapContainer center={[17.445289, 78.349593]} zoom={17} style={{ width: '100%', height: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {this.state.positions.map((position, index) => (
              <Marker
                key={index}
                position={position}
                icon={new L.Icon({
                  iconUrl: markerImage,
                  iconSize: [70, 70],
                  iconAnchor: [15, 30],
                  popupAnchor: [0, -30],
                })}
              >
                <Popup>{`Charger ${index + 1}`}</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', height: '24vw' }}>
          <div style={{ flex: 1, marginRight: '20px', height: '2vw' }}>
            <h4>Charger 1 Energy Consumption</h4>
            <ReactApexChart
              options={this.state.options}
              series={this.state.charger1Series}
              type="bar"
              height={310}
            />
          </div>

          <div style={{ flex: 1 }}>
            <h4>Charger 2 Energy Consumption</h4>
            <ReactApexChart
              options={this.state.options}
              series={this.state.charger2Series}
              type="bar"
              height={310}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default ChargerDashboard;
