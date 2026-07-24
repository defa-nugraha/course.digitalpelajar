@extends('errors.layout')

@section('title', 'Server Bermasalah')
@section('badge', '500 / Server error')
@section('code', '500')
@section('heading', 'Ada kendala pada server.')
@section('message', 'Sistem gagal memproses permintaan. Tim teknis perlu memeriksa log aplikasi atau konfigurasi server.')
