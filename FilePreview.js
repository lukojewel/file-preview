import React, { Component } from 'react';
import $ from 'jquery';
import Gallery from 'react-grid-gallery';
import { DefaultPlayer as Video } from 'react-html5video';
import 'react-html5video/dist/styles.css';
import ReactAudioPlayer from 'react-audio-player';

export default class FilePreview extends Component{
	constructor(props){
		super(props);
		this.state = {

		}
	}
	findType(extension){
		// image
		if(extension=='jpg' || extension=='jpeg' || extension=='png' || extension=='gif'){
			return 0
		}
		// video
		if(extension=='mp4' || extension=='mpeg' || extension=='vob' || extension=='avi' || extension=='3gp' || extension=='flv' || extension=='mov' || extension=='wmv'){
			return 1
		}
		// audio
		if(extension=='mp3' || extension=='wav' || extension=='flac' || extension=='m4a' || extension=='amr' || extension=='ogg' || extension=='wma'){
			return 2
		}
		// pdf
		if(extension=='pdf'){
			return 3
		}
		// doc
		if(extension=='doc' || extension=='docx' || extension=='rtf'){
			return 4
		}
		//all others 
		return 5
			
	}
	
	render(){
		var url = this.props.url;
		var extension = url.split('.').pop();
		var type = this.findType(extension);

		if(type==0){

			var IMAGES = [] ;
			var image = {
				src: url,
				thumbnail: url,
			}
			IMAGES.push(image);

			return(
				
				<div className="">
    				<Gallery images={IMAGES} enableImageSelection={false}/>
    			</div>
			)
		}
		if(type==1){
			return(
				<div key={url} className="col-md-5 no-padding">
		      		<Video loop
			            controls={['PlayPause', 'Seek', 'Time', 'Volume', 'Fullscreen']}
			            >
			            <source src={url} type="video/mp4" />
			        </Video>
		        </div>
			)
		}
		if(type==2){
			return(
				<div className="col-md-12 fp-audio-wrapper">
					<ReactAudioPlayer src={url} controls/>
				</div>
			)
		}
		if(type==3){
			return(
				<div className="col-md-2 no-padding fp-contestAdmin-acordnPDF-wrapper">
			        <a className="fp-contestAdmin-acordnPDF" href={"http://docs.google.com/gview?url="+url} target="_blank">
			        	<i className="icon-pdf" aria-hidden="true" ></i>
			        	<br/>
			        	&nbsp; &nbsp;	
			        </a>
			    </div>
			)
		}
		if(type==4){
			return(
				<div className="col-md-2 no-padding fp-contestAdmin-acordnPDF-wrapper">
			        <a className="fp-contestAdmin-acordnPDF" href={"http://docs.google.com/gview?url="+url} target="_blank">
			        	<i className="icon-doc" aria-hidden="true" ></i>
			        	<br/>
			        	&nbsp; &nbsp;
			        </a>
			    </div>
			)
		}
		if(type==4){
			return(
				<div className="text-center">
			        <a className="fp-contestAdmin-acordnPDF" href={"http://docs.google.com/gview?url="+url} target="_blank">
			        	<i className="icon-file" aria-hidden="true" ></i>
			        	<br/>
			        	&nbsp; &nbsp;	File
			        </a>
			    </div>
			)
		}
		return <div>File format not supported</div>

	}
}