import { Component } from '@angular/core';

import { AngularFireStorage, AngularFireUploadTask } from '@angular/fire/storage';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { finalize, tap, filter } from 'rxjs/operators';
import { Camera, CameraOptions } from '@ionic-native/camera/ngx';

export interface MyData {
  name: string;
  filepath: string;
  size: number;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  // Upload Task 
  task: AngularFireUploadTask;

  // Progress in percentage
  percentage: Observable<number>;

  // Snapshot of uploading file
  snapshot: Observable<any>;

  // Uploaded File URL
  UploadedFileURL: Observable<string>;

  //Uploaded Image List
  images: Observable<MyData[]>;
  image: string;

  //File details  
  fileName:string;
  fileSize:number;

  //Status check 
  isUploading:boolean;
  isUploaded:boolean;

  private imageCollection: AngularFirestoreCollection<MyData>;

  result$: Observable<any>;

  constructor(private storage: AngularFireStorage, 
    private database: AngularFirestore,
    private camera: Camera) {

    this.isUploading = false;
    this.isUploaded = false;
    //Set collection where our documents/ images info will save
    this.imageCollection = database.collection<MyData>('freakyImages');
    this.images = this.imageCollection.valueChanges();
  }

  startUpload(file: string) {

    // const timestamp = new Date().getTime().toString();
    const docId = this.database.createId();

    const path = `${docId}.jpg`;

    this.isUploading = true;
    this.isUploaded = false;

    // Make a reference to the future location of the firestore document
    const photoRef = this.database.collection('photos').doc(docId)
    
    // Firestore observable, dismiss loader when data is available
    this.result$ = photoRef.valueChanges()
        .pipe(
          filter(data => !!data),
          tap(_ => {})
        );

    
    // The main task
    this.image = 'data:image/jpg;base64,' + file;
    this.task = this.storage.ref(path).putString(this.image, 'data_url'); 
    const fileRef = this.storage.ref(path);

    this.snapshot = this.task.snapshotChanges().pipe(
      
      finalize(() => {
        // Get uploaded file storage path
        this.UploadedFileURL = fileRef.getDownloadURL();
        
        this.UploadedFileURL.subscribe(resp=>{
          this.isUploading = false;
          this.isUploaded = true;
        },error=>{
          console.error(error);
        })
      }),
      tap(snap => {
          this.fileSize = snap.totalBytes;
      })
    )
  }


  async captureAndUpload() {
    const options: CameraOptions = {
      quality: 100,
      destinationType: this.camera.DestinationType.DATA_URL,
      encodingType: this.camera.EncodingType.JPEG,
      mediaType: this.camera.MediaType.PICTURE,
      sourceType: this.camera.PictureSourceType.PHOTOLIBRARY
    }

    const base64 = await this.camera.getPicture(options)

    this.startUpload(base64);
  }
}
