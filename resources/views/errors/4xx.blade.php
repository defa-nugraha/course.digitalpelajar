@extends('errors.layout')

@section('title', 'Permintaan Tidak Dapat Diproses')
@section('badge', 'Error {{ $exception->getStatusCode() }}')
@section('code', (string) $exception->getStatusCode())
@section('heading', 'Permintaan tidak dapat diproses.')
@section('message', $exception->getMessage() ?: 'Periksa kembali alamat halaman, sesi login, atau hak akses akun Anda.')
