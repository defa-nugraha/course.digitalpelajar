@extends('errors.layout')

@section('title', 'Permintaan Tidak Dapat Diproses')
@section('badge', 'Error ' . $exception->getStatusCode())
@section('code', (string) $exception->getStatusCode())
@section('heading', 'Permintaan tidak dapat diproses.')
@section('message', 'Periksa kembali alamat halaman, metode akses, sesi login, atau hak akses akun Anda.')
