/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ListView,
  PushNotificationIOS,
  Platform,
} from 'react-native';
import Beacons  from 'react-native-beacons-manager';
import PushNotification from 'react-native-push-notification';

export default class App extends Component {
  // will be set as a reference to "regionDidEnter" event:
  regionDidEnterEvent = null;
  // will be set as a reference to "regionDidExit" event:
  regionDidExitEvent = null;
  // will be set as a reference to "authorizationStatusDidChange" event:
  authStateDidRangeEvent = null;

 state = {
   // region information
   uuid: '00000000-0000-0000-0001-000000000022',//'7b44b47b-52a1-5381-90c2-f09b6838c5d4',
   identifier: 'CRF_REGION',

   regionEnterDatasource: new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2}).cloneWithRows([]),
   regionExitDatasource:  new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2}).cloneWithRows([])
 };

 enablePush() {
  PushNotification.configure({

    // (required) Called when a remote or local notification is opened or received
    onNotification: function(notification) {
        console.log( 'NOTIFICATION:', notification );

        // process the notification

        // required on iOS only (see fetchCompletionHandler docs: https://facebook.github.io/react-native/docs/pushnotificationios.html)
        notification.finish(PushNotificationIOS.FetchResult.NoData);
    },

    // IOS ONLY (optional): default: all - Permissions to register.
    permissions: {
        alert: true,
        badge: true,
        sound: true
    },

    // Should the initial notification be popped automatically
    // default: true
    popInitialNotification: true,

    /**
      * (optional) default: true
      * - Specified if permissions (ios) and token (android and ios) will requested or not,
      * - if not, you must call PushNotificationsHandler.requestPermissions() later
      */
    requestPermissions: true,
  });
 };

 sendNotification(msg) {
  PushNotification.localNotification({
    title: "CRF Notification",
    message: msg,
  });
 }

 async componentWillMount() {
    const { identifier, uuid } = this.state;
    //
    // ONLY non component state aware here in componentWillMount
    //

    // OPTIONAL: listen to authorization change
    this.authStateDidRangeEvent = Beacons.BeaconsEventEmitter.addListener(
      'authorizationStatusDidChange',
      (info) => console.log('authorizationStatusDidChange: ', info)
    );

    //androis specific configuration
    if(Platform.OS == 'android'){
      try {
        await Beacons.addIBeaconsDetection();
      } catch(err) {
        console.log(`something went wrong during initialization: ${error}`);
      }
    } else {
      // MANDATORY: you have to request ALWAYS Authorization (not only when in use) when monitoring
      // you also have to add "Privacy - Location Always Usage Description" in your "Info.plist" file
      // otherwise monitoring won't work
      Beacons.requestAlwaysAuthorization();
      Beacons.allowsBackgroundLocationUpdates(true);
      Beacons.shouldDropEmptyRanges(true);
    }
    
    // Define a region which can be identifier + uuid,
    // identifier + uuid + major or identifier + uuid + major + minor
    // (minor and major properties are numbers)
    const region = { identifier, uuid };
    console.log('region data ->', region);
    // Monitor for beacons inside the region
    Beacons
    .startMonitoringForRegion(region) // or like  < v1.0.7: .startRangingBeaconsInRegion(identifier, uuid)
    .then(() => console.log('Beacons monitoring started succesfully'))
    .catch(error => console.log(`Beacons monitoring not started, error: ${error}`));
    
    if(Platform.OS == 'ios'){
      // update location to ba able to monitor:
      Beacons.startUpdatingLocation();
    }

    this.enablePush();
  }

  componentDidMount() {
    //
    // component state aware here - attach events
    //
 
    // monitoring:
    this.regionDidEnterEvent = Beacons.BeaconsEventEmitter.addListener(
      'regionDidEnter',
      (data) => {
        this.sendNotification('regionDidEnter');
        console.log('monitoring - regionDidEnter data: ', data);
        this.setState({ regionEnterDatasource: this.state.regionEnterDatasource.cloneWithRows([{ identifier:data.identifier, uuid:data.uuid, minor:data.minor, major:data.major }]) });
      }
    );
 
    this.regionDidExitEvent = Beacons.BeaconsEventEmitter.addListener(
      'regionDidExit',
      ({ identifier, uuid, minor, major }) => {
        this.sendNotification('regionDidExit');
        console.log('monitoring - regionDidExit data: ', { identifier, uuid, minor, major });
       this.setState({ regionExitDatasource: this.state.regionExitDatasource.cloneWithRows([{ identifier, uuid, minor, major }]) });
      }
    );
  }

  componentWillUnMount() {
    // stop monitoring beacons:
    Beacons
    .stopMonitoringForRegion(region)
    .then(() => console.log('Beacons monitoring stopped succesfully'))
    .catch(error => console.log(`Beacons monitoring not stopped, error: ${error}`));
    // stop updating locationManager:
    Beacons.stopUpdatingLocation();
    // remove auth state event we registered at componentDidMount:
    this.authStateDidRangeEvent.remove();
    // remove monitiring events we registered at componentDidMount::
    this.regionDidEnterEvent.remove();
    this.regionDidExitEvent.remove();
  }

  render() {
    const { regionEnterDatasource, regionExitDatasource } =  this.state;
 
    return (
      <View style={styles.container}>
        <Text style={styles.headline}>
          monitoring enter information:
        </Text>
        <ListView
          dataSource={ regionEnterDatasource }
          enableEmptySections={ true }
          renderRow={this.renderMonitoringEnterRow}
        />
 
        <Text style={styles.headline}>
          monitoring exit information:
        </Text>
        <ListView
          dataSource={ regionExitDatasource }
          enableEmptySections={ true }
          renderRow={this.renderMonitoringLeaveRow}
        />
       </View>
    );
  }

  renderMonitoringEnterRow = ({ identifier, uuid, minor, major }) => {
    return (
      <View style={styles.row}>
        <Text style={styles.smallText}>
          Identifier: {identifier ? identifier : 'NA'}
        </Text>
        <Text style={styles.smallText}>
          UUID: {uuid ? uuid  : 'NA'}
        </Text>
        <Text style={styles.smallText}>
          Major: {major ? major : ''}
        </Text>
        <Text style={styles.smallText}>
          Minor: { minor ? minor : ''}
        </Text>
      </View>
    );
  }

  renderMonitoringLeaveRow = ({ identifier, uuid, minor, major, time }) => {
    return (
      <View style={styles.row}>
        <Text style={styles.smallText}>
          Identifier: {identifier ? identifier : 'NA'}
        </Text>
        <Text style={styles.smallText}>
          UUID: {uuid ? uuid  : 'NA'}
        </Text>
        <Text style={styles.smallText}>
          Major: {major ? major : ''}
        </Text>
        <Text style={styles.smallText}>
          Minor: { minor ? minor : ''}
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    margin: 5,
    backgroundColor: '#F5FCFF',
  },
  justFlex: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btleConnectionStatus: {
    fontSize: 20,
    paddingTop: 20,
  },
  headline: {
    fontSize: 20,
    paddingTop: 20,
    marginBottom: 20,
  },
  row: {
    padding: 8,
    paddingBottom: 16,
  },
  smallText: {
    fontSize: 11,
  },
  rowSection: {
    fontWeight: '700',
  },
});